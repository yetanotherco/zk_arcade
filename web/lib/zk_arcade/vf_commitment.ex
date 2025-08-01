defmodule ZkArcade.VerificationDataCommitment do
  require Logger
  alias ExSecp256k1

  def compute_verification_data_commitment(verification_data) do
    try do
      proving_system_to_byte = %{
        "GnarkPlonkBls12_381" => 0,
        "GnarkPlonkBn254" => 1,
        "GnarkGroth16Bn254" => 2,
        "SP1" => 3,
        "Risc0" => 4,
        "CircomGroth16Bn256" => 5
      }

      proof = verification_data["proof"]
      proof_bin = if is_list(proof), do: :erlang.list_to_binary(proof), else: proof
      proof_commitment = keccak256(proof_bin)

      pub_input_commitment = case verification_data["publicInput"] do
        nil -> <<0::size(256)>>
        public_input ->
          pub_input_bin = if is_list(public_input), do: :erlang.list_to_binary(public_input), else: public_input
          keccak256(pub_input_bin)
      end

      proving_system_byte = Map.get(proving_system_to_byte, verification_data["provingSystem"], 0)
      proving_system_aux_data_commitment =
        cond do
          verification_data["verificationKey"] ->
            vk_data = verification_data["verificationKey"]
            vk_bin = if is_list(vk_data), do: :erlang.list_to_binary(vk_data), else: vk_data
            keccak256(vk_bin <> <<proving_system_byte>>)
          verification_data["vmProgramCode"] ->
            vm_program_data = verification_data["vmProgramCode"]
            vm_program_bin = if is_list(vm_program_data), do: :erlang.list_to_binary(vm_program_data), else: vm_program_data
            keccak256(vm_program_bin <> <<proving_system_byte>>)
          true ->
            <<0::size(256)>>
        end

      {:ok, proof_generator_address} = decode_hex(verification_data["proofGeneratorAddress"])
      proof_generator_address_bytes = proof_generator_address

      commitment_digest = keccak256(
        proof_commitment <>
        pub_input_commitment <>
        proving_system_aux_data_commitment <>
        proof_generator_address_bytes
      )

      {
        :ok,
        %{
          proof_commitment: digest_to_hex(proof_commitment),
          pub_input_commitment: digest_to_hex(pub_input_commitment),
          proving_system_aux_data_commitment: digest_to_hex(proving_system_aux_data_commitment),
          commitment: digest_to_hex(commitment_digest)
        }
      }
    rescue
      e -> {:error, "Error computing verification data hash: #{inspect(e)}"}
    end
  end

  defp digest_to_hex(digest) do
    "0x" <> Base.encode16(digest, case: :lower)
  end

    # Used for convert a string value representing an address to bytes
  defp decode_hex("0x" <> hex), do: decode_hex(hex)
  defp decode_hex(hex) when is_binary(hex) do
    case Base.decode16(hex, case: :mixed) do
      {:ok, bytes} -> {:ok, bytes}
      :error -> {:error, "Invalid hex string: #{hex}"}
    end
  end
  defp decode_hex(nil), do: {:error, "Cannot decode nil hex"}

  defp keccak256(data) do
    ExKeccak.hash_256(data)
  end
end
