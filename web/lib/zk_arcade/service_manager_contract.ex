defmodule ZkArcade.ServiceManagerContract do
  require Logger

  use Ethers.Contract,
    abi_file: "lib/abi/ServiceManager.json"

  # {
  #   "type":"function",
  #   "name":"verifyBatchInclusion",
  #   "inputs":[
  #       {"name":"proofCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"pubInputCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"provingSystemAuxDataCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"proofGeneratorAddr","type":"bytes20","internalType":"bytes20"},
  #       {"name":"batchMerkleRoot","type":"bytes32","internalType":"bytes32"},
  #       {"name":"merkleProof","type":"bytes","internalType":"bytes"},
  #       {"name":"verificationDataBatchIndex","type":"uint256","internalType":"uint256"},
  #       {"name":"senderAddress","type":"address","internalType":"address"}
  #   ],
  #   "outputs":[
  #       {"name":"","type":"bool","internalType":"bool"}
  #   ],
  #   "stateMutability":"view"
  # },

  # {
  #   "type":"function",
  #   "name":"verifyBatchInclusion",
  #   "inputs":[
  #       {"name":"proofCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"pubInputCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"provingSystemAuxDataCommitment","type":"bytes32","internalType":"bytes32"},
  #       {"name":"proofGeneratorAddr","type":"bytes20","internalType":"bytes20"},
  #       {"name":"batchMerkleRoot","type":"bytes32","internalType":"bytes32"},
  #       {"name":"merkleProof","type":"bytes","internalType":"bytes"},
  #       {"name":"verificationDataBatchIndex","type":"uint256","internalType":"uint256"}
  #   ],
  #   "outputs":[
  #       {"name":"","type":"bool","internalType":"bool"}
  #   ],
  #   "stateMutability":"view"
  # }

  def verify_batch_inclusion(proof_commitment, pub_input_commitment, proving_system_aux_data_commitment, proof_generator_addr, batch_merkle_root, merkle_proof, verification_data_batch_index) do
    contract_address = Application.get_env(:zk_arcade, :service_manager_address)
    {:ok, result} = verify_batch_inclusion(proof_commitment, pub_input_commitment, proving_system_aux_data_commitment, proof_generator_addr, batch_merkle_root, merkle_proof, verification_data_batch_index) |> Ethers.call(to: contract_address)
    result
  end
end
