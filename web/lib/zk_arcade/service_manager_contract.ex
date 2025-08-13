defmodule ZkArcade.ServiceManagerContract do
  require Logger

  use Ethers.Contract,
    abi_file: "lib/abi/ServiceManager.json"

  def verify_proof_inclusion(proof_commitment, pub_input_commitment, proving_system_aux_data_commitment, proof_generator_addr, batch_merkle_root, merkle_proof, verification_data_batch_index, sender_address) do
    contract_address = Application.get_env(:zk_arcade, :service_manager_address)

    Logger.info("Verifying batch inclusion with sender address: #{inspect(sender_address)}")

    {:ok, result} = verify_batch_inclusion(
      proof_commitment,
      pub_input_commitment,
      proving_system_aux_data_commitment,
      proof_generator_addr,
      batch_merkle_root,
      merkle_proof,
      verification_data_batch_index,
      sender_address
    ) |> Ethers.call(to: contract_address)

    result
  end

  defp keccak256(data) do
    ExKeccak.hash_256(data)
  end

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

  defp to_binary(data) when is_binary(data), do: data
  defp to_binary(data) when is_list(data), do: :binary.list_to_bin(data)

  def batch_status_call_with_sender(merkle_root, sender_address) do
    merkle_root_bin = to_binary(merkle_root)
    sender_address_bin = hex_to_bytes(sender_address)

    identifier = keccak256(merkle_root_bin <> sender_address_bin)

    contract_address = Application.get_env(:zk_arcade, :service_manager_address)
    {:ok, status} = batches_state(identifier) |> Ethers.call(to: contract_address)
    Logger.info("Status is #{inspect(status)}")
    status
  end
end
