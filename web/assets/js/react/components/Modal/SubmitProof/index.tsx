import React, { useCallback, useEffect, useState } from "react";
import { Modal, ModalProps } from "../Modal";
import { Address, formatEther } from "viem";
import { ProofSubmission } from "../../../types/aligned";
import { useBatcherPaymentService } from "../../../hooks/useBatcherPaymentService";
import { DepositStep } from "./DepositStep";
import { SubmitProofStep } from "./SubmitStep";
import { ClaimStep } from "./ClaimStep";
import { Button } from "../../Button";

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

type SubmitProofModalSteps = "deposit" | "submit" | "claim";

export const SubmitProofModal = ({
	modal,
	proof,
	payment_service_address,
	user_address,
}: Props) => {
	const [step, setStep] = useState<SubmitProofModalSteps | undefined>();
	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const updateState = useCallback(() => {
		if (proof) {
			if (proof.status === "pending") {
				setStep("submit");
			}
			if (proof.status === "claimed") {
				setStep("claim");
			}
		} else {
			if (Number(formatEther(balance.data || BigInt(0))) >= 0.001) {
				setStep("submit");
			} else {
				setStep("deposit");
			}
		}
	}, [balance.data, setStep]);

	const goToNextStep = useCallback(() => {
		if (step === "deposit") setStep("submit");
		if (step === "submit") setStep("claim");
	}, [setStep]);

	useEffect(() => {
		if (!step && balance.data != undefined) {
			updateState();
		}
	}, [balance.data, setStep]);

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

	const modalBasedOnStep = {
		deposit: () => (
			<DepositStep
				payment_service_address={payment_service_address}
				user_address={user_address}
				setOpen={modal.setOpen}
				updateState={goToNextStep}
			/>
		),
		submit: () => <SubmitProofStep />,
		claim: () => <ClaimStep />,
	};

	return (
		<Modal
			maxWidth={800}
			shouldCloseOnEsc={false}
			shouldCloseOnOutsideClick={false}
			{...modal}
		>
			<div className="rounded w-full bg-contrast-100 p-10 flex flex-col items-center gap-10 h-[600px]">
				<div>
					<h1 className="text-center mb-2 text-lg font-normal">
						Deposit into Aligned Batcher
					</h1>
					<p className="text-text-200">
						You need to deposit money into aligned batcher in order
						to verify your proof on Aligned.
					</p>
				</div>
				<div>
					<div className="flex gap-8 justify-center w-full">
						<BreadCumb
							step="Deposit"
							status={shouldDeposit ? "done" : "pending"}
						/>
						<BreadCumb
							step="Submission"
							status={
								proof ? submissionStatus[proof.status] : "none"
							}
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
				</div>
				<div className="w-full h-full">
					{step ? (
						modalBasedOnStep[step]()
					) : (
						<p className="text-center">Loading...</p>
					)}
				</div>
			</div>
		</Modal>
	);
};
