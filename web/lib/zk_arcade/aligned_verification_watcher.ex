defmodule ZkArcade.AlignedVerificationWatcher do
  require Logger

  defp bin(v) when is_binary(v), do: v
  defp bin(v) when is_list(v),   do: :erlang.iolist_to_binary(v)
  defp bin(nil), do: nil

  defp hex_to_bytes("0x" <> rest), do: hex_to_bytes(rest)
  defp hex_to_bytes(hex) when is_binary(hex) do
    hex
    |> even_length_hex()
    |> String.upcase()
    |> Base.decode16!(case: :mixed)
  end

  defp even_length_hex(h) do
    if rem(byte_size(h), 2) == 1, do: "0" <> h, else: h
  end

  def wait_aligned_verification(submit_proof_message, batch_inclusion_data) do
    Logger.info("Waiting for aligned verification...")

    payment_service_addr = Application.get_env(:zk_arcade, :payment_service_address)

    verification_data = submit_proof_message["verificationData"]["verificationData"]

    with {:ok, commitment} <-
          ZkArcade.VerificationDataCommitment.compute_verification_data_commitment(verification_data) do
      proof_commitment_bin = hex_to_bytes(commitment.proof_commitment)
      pub_input_commitment_bin = hex_to_bytes(commitment.pub_input_commitment)
      ps_aux_commitment_bin = hex_to_bytes(commitment.proving_system_aux_data_commitment)

      batch_merkle_root_bin = bin(batch_inclusion_data["batch_merkle_root"])

      merkle_path_chunks =
        get_in(batch_inclusion_data, ["batch_inclusion_proof", "merkle_path"]) || []

      encoded_merkle_proof =
        merkle_path_chunks
        |> Enum.map(&bin/1)
        |> Enum.map(fn chunk ->
          if byte_size(chunk) != 32 do
            Logger.warning("Merkle proof chunk has size #{byte_size(chunk)}, expected 32")
          end
          chunk
        end)
        |> :erlang.iolist_to_binary()

      index_in_batch = batch_inclusion_data["index_in_batch"]

      proof_generator_addr20 =
        verification_data["proofGeneratorAddress"]
        |> hex_to_bytes()

      verify_fn = fn ->
        ZkArcade.ServiceManagerContract.verify_proof_inclusion(
          proof_commitment_bin,
          pub_input_commitment_bin,
          ps_aux_commitment_bin,
          proof_generator_addr20,
          batch_merkle_root_bin,
          encoded_merkle_proof,
          index_in_batch,
          payment_service_addr
        )
      end

      result = retry_with_backoff(verify_fn, [30, 60, 120, 240])

      case result do
        true -> {:ok, "ok"}
        false -> {:error, "Verification failed after retries"}
        {:error, reason} -> {:error, reason}
      end
    else
      {:error, reason} ->
        {:error, reason}
    end
  end

  defp retry_with_backoff(fun, []), do: false
  defp retry_with_backoff(fun, [delay | rest]) do
    :timer.sleep(:timer.seconds(delay))
    case fun.() do
      true ->
        true
      false ->
        Logger.info("Verification failed, retrying in #{delay} seconds...")
        retry_with_backoff(fun, rest)
    end
  end
end
