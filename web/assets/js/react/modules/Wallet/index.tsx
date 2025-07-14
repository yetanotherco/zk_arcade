import React from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ConnectWalletWithAgreement } from "./ConnectWalletWithAgreement";
import { WalletInfo } from "./WalletInfo";

type Props = {
	network: string;
	payment_service_address: string;
	user_address?: string;
};

export default ({ network, payment_service_address, user_address }: Props) => {
	return (
		<Web3EthProvider network={network}>
			{user_address ? (
				<WalletInfo
					network={network}
					payment_service_address={payment_service_address}
					user_address={user_address}
				/>
			) : (
				<ConnectWalletWithAgreement />
			)}
		</Web3EthProvider>
	);
};
