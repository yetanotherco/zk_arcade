import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { WithdrawFromAlignedModal } from "../../components/Modal/WithdrawFromAligned";
import { useModal } from "../../hooks";

type Props = {
	payment_service_address: Address;
	user_address: Address;
	network: string;
};

const WithdrawFromAlignedBtn = ({
	payment_service_address,
	user_address,
}: Omit<Props, "network">) => {
	const { open, setOpen, toggleOpen } = useModal();

	return (
		<>
			<button
				className="rounded text-md font-bold text-accent-100 hover:underline"
				onClick={toggleOpen}
			>
				Withdraw
			</button>
			<WithdrawFromAlignedModal
				payment_service_address={payment_service_address}
				user_address={user_address}
				open={open}
				setOpen={setOpen}
			/>
		</>
	);
};

export default ({ network, payment_service_address, user_address }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<WithdrawFromAlignedBtn
					payment_service_address={payment_service_address}
					user_address={user_address}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
