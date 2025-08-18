import React, { useEffect, useState } from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Button } from "../../components/Button";
import { useModal } from "../../hooks/useModal";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import {
	fetchProofSubmission,
	fetchProofVerificationData,
} from "../../utils/aligned";
import { ProofSubmission } from "../../types/aligned";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	beast_submissions: string;
};

const SubmitModal = ({
	user_address,
	leaderboard_address,
	payment_service_address,
	batcher_url,
	beast_submissions,
}: Omit<Props, "network">) => {
	const { open, setOpen, toggleOpen } = useModal();
	const { open: currentProofOpen, setOpen: currentProofSetOpen } = useModal();

	const [currentProof, setCurrentProof] = useState<ProofSubmission | null>(
		null
	);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const proofId = params.get("submitProofId");

		const fetchProof = async () => {
			if (proofId) {
				const res = await fetchProofSubmission(proofId);

				setCurrentProof(res);
				currentProofSetOpen(true);
				window.history.replaceState({}, "", window.location.pathname);
			}
		};

		fetchProof();
	}, []);

	if (!user_address) return null;
	return (
		<>
			<Button variant="icon" onClick={toggleOpen}>
				<span className="hero-plus h-[20px] w-[20px]"></span>
			</Button>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				userBeastSubmissions={JSON.parse(beast_submissions)}
			/>
			{currentProof && (
				<SubmitProofModal
					modal={{
						open: currentProofOpen,
						setOpen: currentProofSetOpen,
					}}
					batcher_url={batcher_url}
					leaderboard_address={leaderboard_address}
					payment_service_address={payment_service_address}
					user_address={user_address}
					userBeastSubmissions={JSON.parse(beast_submissions)}
					proof={currentProof}
				/>
			)}
		</>
	);
};

export default ({
	network,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
	beast_submissions,
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
					beast_submissions={beast_submissions}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
