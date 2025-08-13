import React from "react";
import { Modal, ModalProps } from "../Modal";
import { Address, formatEther } from "viem";
import { ProofSubmission } from "../../../types/aligned";
import { useBatcherPaymentService } from "../../../hooks/useBatcherPaymentService";
import { DepositStep } from "./DepositStep";
import { SubmitProofStep } from "./SubmitStep";
import { ClaimStep } from "./ClaimStep";

type Props = {
	modal: Omit<ModalProps, "maxWidth">;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	proof?: ProofSubmission;
};

type BreadCumbStatus = "done" | "pending" | "failed" | "none";

const BreadCumb = ({
	status,
	step,
}: {
	status: BreadCumbStatus;
	step: string;
}) => {
	const bg = {
		done: "bg-accent-100",
		pending: "bg-yellow",
		failed: "bg-red",
		none: "bg-contrast-200",
	};

	return (
		<div className="w-[220px]">
			<p className="text-center mb-1">{step}</p>
			<div className={`h-[5px] rounded w-full ${bg[status]}`}></div>
		</div>
	);
};

export const SubmitProofModal = ({
	modal,
	proof,
	payment_service_address,
	user_address,
}: Props) => {
	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const submissionStatus: {
		[key in ProofSubmission["status"]]: BreadCumbStatus;
	} = {
		pending: "pending",
		claimed: "done",
		failed: "failed",
		submitted: "done",
		underpriced: "pending",
	};

	const availableBalance = balance.data ? formatEther(balance.data) : "0";
	const shouldDeposit = !proof && Number(availableBalance) > 0.0001;

	const getCurrentStep: () => "deposit" | "submit" | "claim" = () => {
		return "deposit";
	};

	const modalBasedOnStep = {
		deposit: () => <DepositStep />,
		submit: () => <SubmitProofStep />,
		claim: () => <ClaimStep />,
	};

	return (
		<Modal maxWidth={1000} {...modal}>
			<div className="rounded w-full bg-contrast-100 p-10 flex flex-col items-center gap-10">
				<h1 className="text-lg font-normal">Proof submission</h1>
				<div className="flex gap-8 justify-center w-full">
					<BreadCumb
						step="Deposit"
						status={shouldDeposit ? "done" : "pending"}
					/>
					<BreadCumb
						step="Submission"
						status={proof ? submissionStatus[proof.status] : "none"}
					/>
					<BreadCumb
						step="Claim"
						// Check if the game is outdated and not claimed and mark as failed
						status={
							proof?.status === "submitted"
								? "pending"
								: proof?.status === "claimed"
								? "done"
								: "none"
						}
					/>
				</div>
				{modalBasedOnStep[getCurrentStep()]()}
			</div>
		</Modal>
	);
};
