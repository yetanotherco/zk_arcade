import React, { useCallback, useEffect, useState } from "react";
import { Modal, ModalProps } from "../Modal";
import { Address, formatEther } from "viem";
import { BeastProofClaimed, ProofSubmission } from "../../../types/aligned";
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
	userBeastSubmissions: BeastProofClaimed[];
};

type BreadCrumbStatus = "success" | "warn" | "failed" | "neutral";

const BreadCrumb = ({
	active,
	step,
	status,
}: {
	active: boolean;
	step: string;
	status: BreadCrumbStatus;
}) => {
	const statusIcon = {
		success: "hero-check-circle text-accent-100",
		warn: "hero-exclamation-triangle text-yellow",
		failed: "hero-x-circle text-red",
		neutral: "",
	};

	return (
		<div className="w-full max-w-[220px]">
			<div className="flex gap-2 justify-center items-center">
				<p className="text-center mb-1">{step}</p>
				{status !== "neutral" && (
					<span className={`size-5 ${statusIcon[status]}`}></span>
				)}
			</div>
			<div
				className={`h-[5px] rounded w-full ${
					active ? "bg-accent-100" : "bg-contrast-200"
				}`}
			></div>
		</div>
	);
};

type SubmitProofModalSteps = "deposit" | "submit" | "claim";

export const SubmitProofModal = ({
	modal,
	proof,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
	userBeastSubmissions,
}: Props) => {
	const [step, setStep] = useState<SubmitProofModalSteps | undefined>();
	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [proofStatus, setProofStatus] = useState<
		ProofSubmission["status"] | undefined
	>(proof?.status);
	const [depositStatus, setDepositStatus] =
		useState<BreadCrumbStatus>("neutral");
	const [submissionStatus, setSubmissionStatus] =
		useState<BreadCrumbStatus>("neutral");

	const updateState = useCallback(() => {
		if (proof) {
			if (
				proofStatus === "pending" ||
				proofStatus === "underpriced" ||
				proofStatus === "submitted" ||
				proofStatus === "failed"
			) {
				setStep("submit");
			}
			if (proofStatus === "claimed" || proofStatus === "verified") {
				setStep("claim");
			}
		} else {
			if (Number(formatEther(balance.data || BigInt(0))) >= 0.001) {
				setStep("submit");
			} else {
				setStep("deposit");
			}
		}
	}, [balance.data, proofStatus]);

	const goToNextStep = useCallback(() => {
		if (step === "deposit") setStep("submit");
		if (step === "submit") setStep("claim");
	}, [step, setStep]);

	useEffect(() => {
		if (!step && balance.data != undefined) {
			updateState();
		}
	}, [balance.data, setStep]);

	useEffect(() => {
		if (proofStatus) {
			updateState();
		}
	}, [proofStatus]);

	const headerBasedOnStep = {
		deposit: {
			header: "Deposit into Aligned Batcher",
			subtitle:
				"You need to deposit money into aligned batcher in order to verify your proof on Aligned.",
		},
		submit: {
			header: "Submit your proof",
			subtitle:
				"Submit your game solution proof to Aligned to be verified.",
		},
		claim: {
			header: "Claim your points",
			subtitle: "Claim your points into the leaderboard contract.",
		},
	};

	const modalBasedOnStep = {
		deposit: () => (
			<DepositStep
				payment_service_address={payment_service_address}
				user_address={user_address}
				setOpen={modal.setOpen}
				updateState={goToNextStep}
			/>
		),
		submit: () => (
			<SubmitProofStep
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_addr={payment_service_address}
				setOpen={modal.setOpen}
				setStep={setStep}
				userProofs={userBeastSubmissions}
				user_address={user_address}
				proofSubmission={proof}
				proofStatus={proofStatus}
				setProofStatus={setProofStatus}
			/>
		),
		claim: () =>
			proof && (
				<ClaimStep
					setOpen={modal.setOpen}
					proofSubmission={proof}
					user_address={user_address}
					leaderboard_address={leaderboard_address}
					proofStatus={proofStatus}
				/>
			),
	};

	useEffect(() => {
		if (step === "deposit" || (step === "submit" && !proof)) {
			if (Number(formatEther(balance.data || BigInt(0))) < 0.001) {
				setDepositStatus("warn");
			}
		} else {
			setDepositStatus("success");
		}

		if ((step === "deposit" || step === "submit") && !proof) {
			setSubmissionStatus("neutral");
		}

		if (
			proofStatus === "pending" ||
			proofStatus === "underpriced" ||
			proofStatus === "submitted"
		) {
			setSubmissionStatus("warn");
		}

		if (proofStatus === "failed") {
			setSubmissionStatus("failed");
		}

		if (proofStatus === "verified" || proofStatus === "claimed") {
			setSubmissionStatus("success");
		}
	}, [step, depositStatus, submissionStatus]);

	return (
		<Modal
			maxWidth={800}
			shouldCloseOnEsc={false}
			shouldCloseOnOutsideClick={false}
			{...modal}
		>
			<div className="rounded w-full bg-contrast-100 p-10 flex flex-col items-center gap-10 max-h-[90vh]">
				<div>
					<h1 className="text-center mb-2 text-lg font-normal">
						{step ? headerBasedOnStep[step]["header"] : ""}
					</h1>
					<p className="text-text-200">
						{step ? headerBasedOnStep[step]["subtitle"] : ""}
					</p>
				</div>
				<div className="w-full">
					<div className="flex gap-8 justify-center w-full">
						<BreadCrumb
							step="Deposit"
							active={true}
							status={depositStatus}
						/>
						<BreadCrumb
							step="Submission"
							active={step === "submit" || step === "claim"}
							status={submissionStatus}
						/>
						<BreadCrumb
							step="Claim"
							// Check if the game is outdated and not claimed and mark as failed
							active={step === "claim"}
							status={
								proofStatus === "claimed"
									? "success"
									: "neutral"
							}
						/>
					</div>
				</div>
				<div className="w-full h-full max-h-[500px] overflow-scroll">
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
