import React, { useState, useEffect } from 'react';

interface ProcessedVerificationData {
  proof: Uint8Array;
  proofGeneratorAddress: string;
  provingSystem: string;
  publicInput: Uint8Array;
  verificationKey: Uint8Array;
}

interface ProcessedProofVerificationData {
  chain_id: string;
  maxFee: string;
  nonce: string;
  payment_service_addr: string;
  verificationData: ProcessedVerificationData;
}

interface ProcessedProof {
  id: string;
  inserted_at: string;
  wallet_address: string;
  verification_data: ProcessedProofVerificationData;
  updated_at: string;
  batch_data: ProcessedBatchData;
}

interface ProcessedBatchInclusionProof {
  merkle_path: Uint8Array[];
}

interface ProcessedBatchData {
  batch_inclusion_proof: ProcessedBatchInclusionProof;
  batch_merkle_root: Uint8Array;
  index_in_batch: number;
  user_nonce: string;
}

type Props = {
  user_address: string;
  proofs: string;
};

const ListProofs = ({ user_address, proofs }: Props) => {
  const [parsedProofs, setParsedProofs] = useState<ProcessedProof[]>([]);


  useEffect(() => {
    try {
      const parsed = JSON.parse(proofs);
      setParsedProofs(parsed);
    } catch (e) {
      console.error("Failed to parse proofs JSON", e);
    }
  }, [proofs]);


  const uint8ArrayToHex = (array: Uint8Array): string => {
    return Array.from(array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  };

  return (
    <div>
      <h3>Proofs for User</h3>
      <p>User Address: {user_address}</p>
      <p>Total Proofs: {parsedProofs.length}</p>

      {parsedProofs.length === 0 ? (
        <p>No proofs found for this user.</p>
      ) : (
        <div>
          {parsedProofs.map((proof) => (
            <div 
              key={proof.id} 
              style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px',
              }}
            >
              <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>
                Proof ID: {proof.id}
              </h3>

              <p>Wallet Address: {proof.wallet_address} </p>              

              <p>Chain ID: {proof.verification_data.chain_id} </p>

              <p>Proving System: {proof.verification_data.verificationData.provingSystem} </p>

              <p>Generator Address: {proof.verification_data.verificationData.proofGeneratorAddress} </p>

              <p>Max Fee: {proof.verification_data.maxFee} </p>

              <p>Nonce: {proof.verification_data.nonce} </p>

              <p>Payment Service: {proof.verification_data.payment_service_addr} </p>

              <p>Public Input: {proof.verification_data.verificationData.publicInput} </p>

              <p>Proof Data: {proof.verification_data.verificationData.proof} </p>

              <p> Verification Key: {proof.verification_data.verificationData.verificationKey} </p>

              <div style={{ marginTop: '12px' }}>
                <p><strong>Batch Data:</strong></p>
                <div>
                  <p> Merkle Root: {proof.batch_data.batch_merkle_root} </p>
                  <p> Index in Batch: {proof.batch_data.index_in_batch} </p>
                  <p> User Nonce: {proof.batch_data.user_nonce} </p>
                  <p> Merkle Path ({proof.batch_data.batch_inclusion_proof.merkle_path.length} nodes): </p>
                  <div style={{ marginLeft: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                    {proof.batch_data.batch_inclusion_proof.merkle_path.map((path, index) => (
                      <p key={index} style={{ fontSize: '0.7em', margin: '2px 0', fontFamily: 'monospace' }}>
                        [{index}]: {uint8ArrayToHex(path)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListProofs;
