import React from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ConnectWalletWithAgreement } from "./ConnectWalletWithAgreement";
import { WalletInfo } from "./WalletInfo";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";

type Props = {
	network: string;
	payment_service_address: Address;
	leaderboard_address: Address;
	user_address?: Address;
	proofs: string;
};

export default ({
	network,
	payment_service_address,
	leaderboard_address,
	user_address,
	proofs,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				{user_address ? (
					<WalletInfo
						network={network}
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						user_address={user_address}
						proofs={JSON.parse(proofs)}
					/>
				) : (
					<ConnectWalletWithAgreement />
				)}
			</ToastsProvider>
		</Web3EthProvider>
	);
};
