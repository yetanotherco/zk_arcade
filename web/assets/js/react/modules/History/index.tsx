import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ProofHistory } from "./ProofHistory";

type Props = {
	network: string;
	leaderboard_address?: Address;
	proofs: string;
};

export default ({ network, leaderboard_address, proofs }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ProofHistory
				proofs={proofs}
				leaderboard_address={leaderboard_address}
			/>
		</Web3EthProvider>
	);
};
