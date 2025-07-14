import React, { useState, useEffect } from "react";

import { Address } from "viem";

type VerificationDataInner = {
  proof: Uint8Array;
  proofGeneratorAddress: string;
  provingSystem: string;
  publicInput: Uint8Array;
  verificationKey: Uint8Array;
};

type VerificationData = {
  chain_id: `0x${string}`;
  maxFee: `0x${string}`;
  nonce: `0x${string}`;
  payment_service_addr: string;
  verificationData: VerificationDataInner;
};

type Proof = {
  id: string;
  wallet_address: string;
  verification_data: VerificationData;
  inserted_at: string;
  updated_at: string;
};

type Props = {
  user_address: Address;
  proofs: string;
};


function recordToUint8Array(record: Record<string, number>): Uint8Array {
  const keys = Object.keys(record)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);

  const arr = new Uint8Array(keys[keys.length - 1] + 1);

  for (const key of keys) {
    arr[key] = record[key.toString()];
  }

  return arr;
}

const ListProofs = ({ user_address, proofs }: Props) => {
  const [parsedProofs, setParsedProofs] = useState<Proof[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(proofs);
      setParsedProofs(parsed);
    } catch (e) {
      console.error("Failed to parse proofs JSON", e);
    }
  }, [proofs]);

  return (
    <div>
      <p>User: {user_address}</p>
      <ul>
        {parsedProofs.map((proof) => (
          <li key={proof.id}>
            <strong>ID:</strong> {proof.id} <br />
          </li>
        ))}
      </ul>
    </div>
  );
};


export default ListProofs;
