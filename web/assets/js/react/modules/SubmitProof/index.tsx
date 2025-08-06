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
	batcher_url: string;
	user_proofs_json: string;
};

export default ({ network, payment_service_address, user_address, batcher_url, user_proofs_json }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<SubmitProofBeast
					payment_service_address={payment_service_address}
					user_address={user_address}
					batcher_url={batcher_url}
					user_proofs_json={user_proofs_json}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
