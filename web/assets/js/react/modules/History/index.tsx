import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ProofHistory } from "./ProofHistory.jsx";

type Props = {
	network: string;
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
	proofs: string;
};

export default ({
	network,
	leaderboard_address,
	payment_service_address,
	user_address,
	proofs,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ProofHistory
				proofs={proofs}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
			/>
		</Web3EthProvider>
	);
};
