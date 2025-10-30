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
	highest_level_reached: number;
	highest_level_reached_proof_id?: string | number;
};

export const ParityGame = ({
	network,
	payment_service_address,
	user_address,
	leaderboard_address,
	nft_contract_address,
	batcher_url,
	highest_level_reached,
	highest_level_reached_proof_id
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
						highest_level_reached={highest_level_reached}
						highest_level_reached_proof_id={highest_level_reached_proof_id}
					/>
				</AudioProvider>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
