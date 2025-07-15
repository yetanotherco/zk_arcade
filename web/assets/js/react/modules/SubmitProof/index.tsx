import React from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import SubmitProofBeast from "./SubmitProofBeast";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address?: Address;
};

export default ({ network, payment_service_address, user_address }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<SubmitProofBeast
					payment_service_address={payment_service_address}
					user_address={user_address}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
