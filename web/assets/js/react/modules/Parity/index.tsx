import React from "react";
import { Address } from "viem";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Game } from "./Game";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	leaderboard_address: Address;
	batcher_url: string;
};

export const ParityGame = ({ network, user_address }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<Game userAddress={user_address} />
			</ToastsProvider>
		</Web3EthProvider>
	);
};
