defmodule ZkArcade.BatcherConnection do
  require Logger
  require CBOR

  def send_submit_proof_message(submit_proof_message, address) do
    batcher_host = String.to_charlist(Application.get_env(:zk_arcade, :batcher_host))
    batcher_port = Application.get_env(:zk_arcade, :batcher_port)

    connect_opts = %{protocols: [:http]} # Force HTTP/1.1

    conn_result =
      case :gun.open(batcher_host, batcher_port, connect_opts) do
        {:ok, conn_pid} ->
          case :gun.await_up(conn_pid) do
            {:ok, _protocol} ->
              {:ok, conn_pid}

            {:error, :timeout} ->
              Logger.info("Initial connection timed out")
              try_ipv6(batcher_host, batcher_port, connect_opts)

            {:error, reason} ->
              Logger.info("Initial connection failed: #{inspect(reason)}")
              try_ipv6(batcher_host, batcher_port, connect_opts)
          end

        {:error, reason} ->
          Logger.error("Initial connection failed immediately: #{inspect(reason)}")
          try_ipv6(batcher_host, batcher_port, connect_opts)
      end

    case conn_result do
      {:ok, conn_pid} when is_pid(conn_pid) ->
        stream_ref = :gun.ws_upgrade(conn_pid, "/")

        receive do
          {:gun_upgrade, ^conn_pid, ^stream_ref, ["websocket"], _headers} ->
            Logger.info("WebSocket upgrade successful!")
            message = build_submit_proof_message(submit_proof_message, address)
            binary = CBOR.encode(message)
            :gun.ws_send(conn_pid, stream_ref, {:binary, binary})
            handle_websocket_messages(conn_pid, stream_ref)

          {:gun_response, ^conn_pid, ^stream_ref, _, status, headers} ->
            Logger.error("Upgrade failed: #{status}, headers: #{inspect(headers)}")
            close_connection(conn_pid, stream_ref)
            {:error, :upgrade_failed}
        after
          25_000 ->
            Logger.error("Timeout during WebSocket upgrade")
            :gun.close(conn_pid)
            {:error, :upgrade_timeout}
        end

      {:error, reason} ->
        Logger.error("Unable to connect via IPv4 or IPv6: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp try_ipv6(host, port, connect_opts) do
    Logger.info("Trying to connect with IPv6...")
    case :inet.getaddr(host, :inet6) do
      {:ok, ipv6_address} ->
        case :gun.open(ipv6_address, port, connect_opts) do
          {:ok, pid} ->
            case :gun.await_up(pid) do
              {:ok, _protocol} ->
                {:ok, pid}
              {:error, reason} ->
                Logger.error("IPv6 connection failed: #{inspect(reason)}")
                {:error, reason}
            end
          {:error, reason} ->
            Logger.error("IPv6 open failed: #{inspect(reason)}")
            {:error, reason}
        end
      {:error, reason} ->
        Logger.error("Failed to resolve IPv6 address: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp handle_websocket_messages(conn_pid, stream_ref) do
    receive do
      {:gun_ws, ^conn_pid, ^stream_ref, {:binary, msg}} ->
        case CBOR.decode(msg) do
          {:ok, decoded, _rest} ->
            Logger.info("Received from server (binary): #{inspect(decoded)}")
            handle_server_message(decoded, conn_pid, stream_ref)

          {:error, reason} ->
            Logger.error("Failed to decode CBOR message: #{inspect(reason)}")
            Logger.error("Raw message: #{inspect(msg)}")
            close_connection(conn_pid, stream_ref)
            {:error, :decode_error}
        end

      {:gun_ws, ^conn_pid, ^stream_ref, {:close, code, reason}} ->
        Logger.info("WebSocket closed by the server: #{code} - #{reason}")
        :gun.close(conn_pid)
        {:error, :connection_closed}

      {:gun_down, ^conn_pid, _ws, _closed, _children} ->
        Logger.info("Connection closed by the other side")
        {:error, :connection_down}

      {:gun_error, ^conn_pid, ^stream_ref, reason} ->
        Logger.error("WebSocket error: #{inspect(reason)}")
        :gun.close(conn_pid)
        {:error, :websocket_error}
    end
  end

  defp handle_server_message(decoded, conn_pid, stream_ref) do
    case decoded do
      %{"ProtocolVersion" => version} ->
        Logger.info("Protocol version confirmed: #{version}, waiting for response to Submit message")
        handle_websocket_messages(conn_pid, stream_ref)

      %{"BatchInclusionData" => batch_data} ->
        Logger.info("Proof submitted successfully - BatchInclusionData: #{inspect(batch_data)}")
        close_connection(conn_pid, stream_ref)
        {:ok, {:batch_inclusion, batch_data}}

      %{"InsufficientBalance" => address} ->
        Logger.error("Insufficient balance for address #{address}")
        close_connection(conn_pid, stream_ref)
        {:error, {:insufficient_balance, address}}

      %{"InvalidProof" => reason} ->
        Logger.error("There was a problem with the submited proof: #{reason}")
        close_connection(conn_pid, stream_ref)
        {:error, {:invalid_proof, reason}}

      "ProofReplaced" ->
        Logger.warning("Transaction replaced by higher fee")
        close_connection(conn_pid, stream_ref)
        {:error, :replaced_by_higher_fee}

      # There can be more error messages from the batcher, but they will enter on the other clause
      other ->
        Logger.error("Unrecognized message from batcher: #{inspect(other)}")
        close_connection(conn_pid, stream_ref)
        {:error, {:unrecognized_message, other}}
    end
  end

  # Builds the message that will be sent to the batcher
  # It is built this way to match the struct expected by the batcher after
  # the CBOR encoding/decoding process
  defp build_submit_proof_message(submit_proof_message, _address) do
    verification_data = submit_proof_message["verificationData"]["verificationData"]

    %{
      "SubmitProof" => %{
        "verification_data" => %{
          "verification_data" => %{
            "proving_system" => verification_data["provingSystem"],
            "proof" => verification_data["proof"],
            "pub_input" => verification_data["publicInput"],
            "verification_key" => verification_data["verificationKey"],
            "vm_program_code" => verification_data["vmProgramCode"],
            "proof_generator_addr" => verification_data["proofGeneratorAddress"]
          },
          "nonce" => submit_proof_message["verificationData"]["nonce"],
          "max_fee" => submit_proof_message["verificationData"]["maxFee"],
          "chain_id" => submit_proof_message["verificationData"]["chain_id"],
          "payment_service_addr" => submit_proof_message["verificationData"]["payment_service_addr"]
        },
        "signature" => %{
          "r" => submit_proof_message["signature"]["r"],
          "s" => submit_proof_message["signature"]["s"],
          "v" => parse_bigint(submit_proof_message["signature"]["v"])
        }
      }
    }
  end

  # Closes the connection with the batcher notifying it with a close message and waits
  # for the confirmation of the close message before closing the connection
  defp close_connection(conn_pid, stream_ref) do
    Logger.info("Closing the connection with the batcher...")
    :gun.ws_send(conn_pid, stream_ref, {:close, 1000, ""})
    receive do
      {:gun_ws, ^conn_pid, ^stream_ref, {:close, _code, _reason}} ->
        :gun.close(conn_pid)
    after
      10_000 ->
        Logger.warning("Close handshake timed out after 10 seconds; forcing socket close")
        :gun.close(conn_pid)
    end
  end

  defp parse_bigint(v) when is_binary(v) do
    String.to_integer(v)
  end

  defp parse_bigint(v) when is_integer(v), do: v
end
