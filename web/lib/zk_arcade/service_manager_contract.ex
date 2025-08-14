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
end
