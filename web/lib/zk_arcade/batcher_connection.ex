defmodule ZkArcade.BatcherConnection do
  require Logger
  require CBOR

  def send_submit_proof_message(submit_proof_message, address) do
    case open_and_upgrade_connection() do
      {:ok, conn_pid, stream_ref} ->
        receive do
          {:gun_upgrade, ^conn_pid, ^stream_ref, ["websocket"], _headers} ->
            Logger.info("WebSocket upgrade successful!")
            case send_message_and_handle_response(conn_pid, stream_ref, submit_proof_message, address) do
              {:ok, _} = ok -> ok
              other -> other
            end

          {:gun_response, ^conn_pid, ^stream_ref, _, status, headers} ->
            Logger.error("Upgrade failed: #{status}, headers: #{inspect(headers)}")
            close_connection(conn_pid, stream_ref)
            {:error, :upgrade_failed}
        after
          25_000 ->
            Logger.error("Timeout during WebSocket upgrade")
            :gun.close(conn_pid)
            {:error, "Failed to upgrade socket connection due to timeout"}
        end

      {:error, reason} ->
        Logger.error("Failed to connect to batcher: #{inspect(reason)}")
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
        {:error, "Invalid proof - #{reason}"}

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
    end
  end

  defp parse_bigint(v) when is_binary(v) do
    String.to_integer(v)
  end

  defp parse_bigint(v) when is_integer(v), do: v

  # Attempts to open a connection to the batcher and upgrade it to web socket.
  defp try_connection(submit_proof_message, address) do
    case open_and_upgrade_connection() do
      {:ok, conn_pid, stream_ref} ->
        receive do
          {:gun_upgrade, ^conn_pid, ^stream_ref, ["websocket"], _headers} ->
            Logger.info("WebSocket upgrade successful!")
            send_message_and_handle_response(conn_pid, stream_ref, submit_proof_message, address)

          {:gun_response, ^conn_pid, ^stream_ref, _, status, headers} ->
            Logger.error("Upgrade failed: #{status}, headers: #{inspect(headers)}")
            close_connection(conn_pid, stream_ref)
            {:error, :upgrade_failed}
        after
          25_000 ->
            Logger.error("Timeout during WebSocket upgrade")
            :gun.close(conn_pid)
            {:error, :timeout}
        end

      {:error, reason} ->
        Logger.error("Failed to connect to batcher #{inspect(reason)}")
        {:error, :connection_down}
    end
  end

  # Opens a connection to the batcher and upgrades it to web socket connection.
  # First tries to connect to the batcher using the configured host and port via ipv4.
  # If the connection fails, it tries to connect using ipv6 as a fallback
  defp open_and_upgrade_connection() do
    Logger.info("Host is #{inspect(Application.get_env(:zk_arcade, :batcher_host))}")
    batcher_host = String.to_charlist(Application.get_env(:zk_arcade, :batcher_host))
    batcher_port = Application.get_env(:zk_arcade, :batcher_port)

    with {:ok, conn_pid} <- :gun.open(batcher_host, batcher_port),
        {:ok, _protocol} <- :gun.await_up(conn_pid) do
      upgrade_connection(conn_pid)
    else
      {:error, :timeout} ->
        try_ipv6_connection()

      {:error, reason} ->
        Logger.error("Failed to open connection to #{inspect(batcher_host)}:#{batcher_port} - #{inspect(reason)}")
        {:error, reason}
    end
  end

  # Tries to open a connection to the batcher using ipv6 localhost address.
  # This is a fallback in case the initial ipv4 connection fails, and depends on the
  # ip protocol supported by the batcher.
  defp try_ipv6_connection() do
    Logger.info("Connection timed out, trying to connect with IPv6.")

    batcher_host = String.to_charlist(Application.get_env(:zk_arcade, :batcher_host))
    batcher_port = Application.get_env(:zk_arcade, :batcher_port)

    {:ok, ipv6_address} = :inet.getaddr(batcher_host, :inet6)
    {:ok, new_conn_pid} = :gun.open(ipv6_address, batcher_port)

    case :gun.await_up(new_conn_pid) do
      {:ok, _protocol} ->
        upgrade_connection(new_conn_pid)

      {:error, reason} ->
        Logger.error("Failed to open connection on #{inspect(ipv6_address)}:#{batcher_port} - #{inspect(reason)}")
        {:error, reason}
    end

    with {:ok, conn_pid} <- :gun.open(ipv6_address, batcher_port),
        {:ok, _protocol} <- :gun.await_up(conn_pid) do
      upgrade_connection(conn_pid)
    else
      {:error, reason} ->
        Logger.error("Failed to open connection on #{inspect(ipv6_address)}:#{batcher_port} - #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp upgrade_connection(conn_pid) do
    stream_ref = :gun.ws_upgrade(conn_pid, "/")
    {:ok, conn_pid, stream_ref}
  end

  # Sends the message to the batcher and handles the batcher response
  defp send_message_and_handle_response(conn_pid, stream_ref, submit_proof_message, address) do
    message = build_submit_proof_message(submit_proof_message, address)
    binary = CBOR.encode(message)
    Logger.debug("Sending binary message of size: #{byte_size(binary)} bytes")

    :gun.ws_send(conn_pid, stream_ref, {:binary, binary})

    case handle_websocket_messages(conn_pid, stream_ref) do
      {:ok, {:batch_inclusion, _}} = ok ->
        ok

      {:error, :connection_down} = err ->
        Logger.info("Connection down while sending message")
        err

      other ->
        other
    end
  end

end
