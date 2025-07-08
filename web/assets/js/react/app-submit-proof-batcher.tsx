import React from "react";
import Web3EthProvider from "./components/web3-eth-provider";
import SubmitProof from "./components/send-proof-batcher";
import { Address } from "./types/blockchain";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
};

const AppSubmitProof = (props: Props) => {
	return (
		<Web3EthProvider network={props.network}>
			<SubmitProof
				batcherPaymentServiceAddress={props.payment_service_address}
				userAddress={props.user_address}
				{...props}
			/>
		</Web3EthProvider>
	);
};

export default AppSubmitProof;
