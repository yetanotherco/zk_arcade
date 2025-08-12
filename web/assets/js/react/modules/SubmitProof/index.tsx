import React from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Button } from "../../components/Button";
import { useModal } from "../../hooks/useModal";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { ProofSubmission } from "../../types/aligned";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	proof?: ProofSubmission;
};

const SubmitModal = ({
	user_address,
	leaderboard_address,
	payment_service_address,
	proof,
	batcher_url,
}: Omit<Props, "network">) => {
	const { open, setOpen, toggleOpen } = useModal();

	return (
		<>
			<Button variant="icon" onClick={toggleOpen}>
				<span className="hero-plus h-[20px] w-[20px]"></span>
			</Button>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				proof={proof}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
			/>
		</>
	);
};

export default ({
	network,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<SubmitModal
					payment_service_address={payment_service_address}
					user_address={user_address}
					batcher_url={batcher_url}
					leaderboard_address={leaderboard_address}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
