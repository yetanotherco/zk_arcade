import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ProofHistory } from "./ProofHistory.jsx";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";

type Props = {
	network: string;
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
	proofs: string;
	nft_contract_address: Address;
	explorer_url: string;
	batcher_url: string;
};

export default ({
	network,
	leaderboard_address,
	payment_service_address,
	user_address,
	proofs,
	explorer_url,
	batcher_url,
	nft_contract_address,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<ProofHistory
					proofs={JSON.parse(proofs)}
					leaderboard_address={leaderboard_address}
					payment_service_address={payment_service_address}
					user_address={user_address}
					explorer_url={explorer_url}
					batcher_url={batcher_url}
					nft_contract_address={nft_contract_address}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
