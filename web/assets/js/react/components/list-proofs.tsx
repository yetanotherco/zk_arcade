import React, { useState, useEffect } from "react";

import { Address } from "viem";


type Proof = {
  id: string;
  wallet_address: string;
  verification_data: any;
  inserted_at: string;
  updated_at: string;
};

type Props = {
  user_address: Address;
  proofs: string;
};


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
            <strong>Wallet:</strong> {proof.wallet_address}
          </li>
        ))}
      </ul>
    </div>
  );
};


export default ListProofs;
