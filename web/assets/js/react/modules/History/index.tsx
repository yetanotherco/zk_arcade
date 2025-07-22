import React from "react";
import { ProofSubmissions } from "../Wallet/ProofSubmissions";
import { Address } from "../../types/blockchain";

type Props = {
    network: string;
	leaderboard_address?: Address;
	proofs: string;
};

export default ({
    network,
	leaderboard_address,
	proofs,
}: Props) => {
	return (
        <Web3EthProvider network={network}>
            <ProofSubmissions
                leaderboard_address={leaderboard_address!}
                proofs={JSON.parse(proofs)}
            />
        </Web3EthProvider>
	);
};
