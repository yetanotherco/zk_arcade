import React from "react";
import { Address } from "viem";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Game } from "./Game";
import { AudioProvider } from "../../state/audio";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	leaderboard_address: Address;
	nft_contract_address: Address;
	batcher_url: string;
};

export const ParityGame = ({
	network,
	payment_service_address,
	user_address,
	leaderboard_address,
	nft_contract_address,
	batcher_url,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<AudioProvider>
					<Game
						network={network}
						payment_service_address={payment_service_address}
						user_address={user_address}
						leaderboard_address={leaderboard_address}
						batcher_url={batcher_url}
						nft_contract_address={nft_contract_address}
					/>
				</AudioProvider>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
