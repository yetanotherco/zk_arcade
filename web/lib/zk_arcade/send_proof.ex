defmodule ZkArcade.SendProof do
  require Logger
  require CBOR

  def call(submit_proof_message, address) do
    {:ok, conn_pid} = :gun.open({0, 0, 0, 0, 0, 0, 0, 1}, 8080)
    {:ok, _protocol} = :gun.await_up(conn_pid)

    stream_ref = :gun.ws_upgrade(conn_pid, "/")

    receive do
      {:gun_upgrade, ^conn_pid, ^stream_ref, ["websocket"], _headers} ->
        Logger.info("WebSocket upgrade successful!")

        message = build_submit_proof_message(submit_proof_message, address)
        Logger.info("Built message is #{inspect(message)}")

        binary = CBOR.encode(message)
        Logger.debug("Message : #{binary}")

        :gun.ws_send(conn_pid, stream_ref, {:binary, binary})
        :gun.ws_send(conn_pid, stream_ref, {:text, "This is the proof data"})

        handle_websocket_messages(conn_pid, stream_ref)

      {:gun_response, ^conn_pid, ^stream_ref, _, status, headers} ->
        Logger.error("Upgrade failed: #{status}, headers: #{inspect(headers)}")
        {:error, :upgrade_failed}
    end
  end

  defp handle_websocket_messages(conn_pid, stream_ref) do
    receive do
      {:gun_ws, ^conn_pid, ^stream_ref, {:binary, msg}} ->
        {:ok, decoded, _rest} = CBOR.decode(msg)
        Logger.info("Received from server (binary): #{inspect(decoded)}")

        case decoded do
          %{"ProtocolVersion" => _version} ->
            Logger.info("Protocol version confirmed, waiting for a response to the Submit message")
            handle_websocket_messages(conn_pid, stream_ref)

          %{"InsufficientBalance" => address} ->
            Logger.error("Insufficient balance for address #{address}")
            :gun.close(conn_pid)
            {:error, :insufficient_balance}

          %{"Success" => _} ->
            Logger.info("Proof submitted successfully")
            :gun.close(conn_pid)
            :ok

          other ->
            Logger.error("Mensaje not recognized: #{inspect(other)}")
            {:error, :not_recognized}
        end

      {:gun_ws, ^conn_pid, ^stream_ref, {:close, code, reason}} ->
        Logger.info("WebSocket closed by the server: #{code} - #{reason}")
        :gun.close(conn_pid)
        {:error, :connection_closed}

      {:gun_down, ^conn_pid, _ws, _closed, _children} ->
        Logger.info("Connection closed by the other side")
        {:error, :connection_down}

    after
      30_000 ->
        Logger.warn("Timeout waiting for WebSocket response")
        :gun.close(conn_pid)
        {:error, :timeout}
    end
  end

  defp build_submit_proof_message(submit_proof_message, _address) do
    verification_data = submit_proof_message["verificationData"]["verificationData"]

    %{
      "SubmitProof" => %{
        "verification_data" => %{
          "verification_data" => %{
            "proving_system" => verification_data["provingSystem"],
            "proof" => map_to_uint8_array(verification_data["proof"]),
            "pub_input" => map_to_uint8_array(verification_data["publicInput"]),
            "verification_key" => map_to_uint8_array(verification_data["verificationKey"]),
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

  defp map_to_uint8_array(index_map) when is_map(index_map) do
    indexed_values =
      index_map
      |> Enum.map(fn {k, v} -> {String.to_integer(k), v} end)
      |> Enum.into(%{})


    max_index = indexed_values |> Map.keys() |> Enum.max()

    0..max_index
    |> Enum.map(fn index ->
      Map.get(indexed_values, index, 0)
    end)
  end

  defp map_to_uint8_array(nil), do: nil

  defp parse_bigint(v) when is_binary(v) do
    String.to_integer(v)
  end

  defp parse_bigint(v) when is_integer(v), do: v
end
