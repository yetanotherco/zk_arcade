import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalProps } from "../Modal";
import { Address, formatEther } from "viem";
import { ProofSubmission, VerificationData } from "../../../types/aligned";
import { useBatcherPaymentService } from "../../../hooks/useBatcherPaymentService";
import { useNftContract } from "../../../hooks/useNftContract";
import { useBeastLeaderboardContract } from "../../../hooks/useBeastLeaderboardContract";
import { useParityLeaderboardContract } from "../../../hooks/useParityLeaderboardContract";
import { DepositStep } from "./DepositStep";
import { SubmitProofStep } from "./SubmitStep";
import { ClaimStep } from "./ClaimStep";
import { ClaimNft } from "./ClaimNftStep";

type Props = {
	modal: Omit<ModalProps, "maxWidth">;
	payment_service_address: Address;
	user_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	nft_contract_address: Address;
	proof?: ProofSubmission;
	proofToSubmitData: VerificationData | null;
	gameName?: string;
	gameIdx?: number;
	highestLevelReached?: number;
	highestLevelReachedProofId?: string | number;
	currentLevelReached?: number;
};

export type BreadCrumbStatus = "success" | "warn" | "failed" | "neutral";

export function openProofById(proofId: string) {
	const url = `${window.location.pathname}?submitProofId=${proofId}`;
	window.history.pushState({}, "", url);
	window.location.reload();
}

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
		<div className="w-full min-w-[125px] max-w-[220px]">
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

type SubmitProofModalSteps = "claim-nft" | "deposit" | "submit" | "claim";

export const SubmitProofModal = ({
	modal,
	proof,
	payment_service_address,
	user_address,
	batcher_url,
	leaderboard_address,
	proofToSubmitData,
	nft_contract_address,
	gameName,
	gameIdx,
	highestLevelReached,
	highestLevelReachedProofId,
	currentLevelReached,
}: Props) => {
	const [step, setStep] = useState<SubmitProofModalSteps | undefined>();
	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});
	const [proofStatus, setProofStatus] = useState<
		ProofSubmission["status"] | undefined
	>(proof?.status);
	const [claimNftStatus, setClaimNftStatus] =
		useState<BreadCrumbStatus>("neutral");
	const [depositStatus, setDepositStatus] =
		useState<BreadCrumbStatus>("neutral");
	const [submissionStatus, setSubmissionStatus] =
		useState<BreadCrumbStatus>("neutral");
	
	useEffect(() => {
		if (proofToSubmitData && highestLevelReached && Number(highestLevelReached) === (currentLevelReached ?? 0)) {
			const proofIdCandidate = highestLevelReachedProofId ?? proof?.id;
			if (proofIdCandidate) {
				try {
					openProofById(String(proofIdCandidate));
				} catch (e) {
					console.warn("Failed to open proof by id:", e);
				}
			}
		}
	}, [highestLevelReachedProofId, proof, proofToSubmitData, currentLevelReached, highestLevelReached]);


	const { balance: nftBalance } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});
	const { currentGame: beastCurrentGame } = useBeastLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});
	const { currentGame: parityCurrentGame } = useParityLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const activeGameName = (gameName || proof?.game || "").toLowerCase();
	const beastEndsAt = beastCurrentGame.game?.endsAtTime;
	const parityEndsAt = parityCurrentGame.game?.endsAtTime;

	const claimExpiryTimestampSeconds = useMemo(() => {
		if (activeGameName === "beast") {
			const endsAt = beastEndsAt;
			return endsAt && endsAt > 0n ? Number(endsAt) : null;
		}

		if (activeGameName === "parity") {
			const endsAt = parityEndsAt;
			return endsAt && endsAt > 0n ? Number(endsAt) : null;
		}

		return null;
	}, [activeGameName, beastEndsAt, parityEndsAt]);

	const [expiresInLabel, setExpiresInLabel] = useState<string | null>(null);

	useEffect(() => {
		if (!claimExpiryTimestampSeconds) {
			setExpiresInLabel(null);
			return;
		}

		const updateLabel = () => {
			const diffMs = claimExpiryTimestampSeconds * 1000 - Date.now();

			if (diffMs <= 0) {
				setExpiresInLabel("Expired");
				return;
			}

			const totalSeconds = Math.floor(diffMs / 1000);
			const days = Math.floor(totalSeconds / 86400);
			const hours = Math.floor((totalSeconds % 86400) / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);

			const parts: string[] = [];
			if (days > 0) parts.push(`${days}d`);
			if (hours > 0 || days > 0) parts.push(`${hours}h`);
			parts.push(`${minutes}m`);

			setExpiresInLabel(parts.join(" "));
		};

		updateLabel();

		const timer = setInterval(updateLabel, 60_000);
		return () => clearInterval(timer);
	}, [claimExpiryTimestampSeconds]);

	const claimExpiryDate = useMemo(() => {
		if (!claimExpiryTimestampSeconds) return null;
		return new Date(claimExpiryTimestampSeconds * 1000);
	}, [claimExpiryTimestampSeconds]);

	const claimExpiryDateUtc = useMemo(() => {
		if (!claimExpiryDate) return null;
		return claimExpiryDate.toUTCString();
	}, [claimExpiryDate]);

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
			if (Number(nftBalance.data) == 0) {
				setStep("claim-nft");
				return;
			}
			if (Number(formatEther(balance.data || BigInt(0))) >= 0.001) {
				setDepositStatus("success");
				setStep("submit");
			} else {
				setStep("deposit");
			}
		}
	}, [balance.data, nftBalance.data, proofStatus]);

	const goToNextStep = useCallback(() => {
		if (step === "claim-nft") {
			setClaimNftStatus("success");
			if (Number(formatEther(balance.data || BigInt(0))) >= 0.001) {
				setDepositStatus("success");
				setStep("submit");
			} else {
				setDepositStatus("warn");
				setStep("deposit");
			}
		}
		if (step === "deposit") setStep("submit");
		if (step === "submit") setStep("claim");
	}, [step, setStep]);

	useEffect(() => {
		if (
			!step &&
			balance.data != undefined &&
			nftBalance.data != undefined
		) {
			updateState();
		}
	}, [balance.data, nftBalance.data, setStep]);

	useEffect(() => {
		if (proofStatus) {
			updateState();
		}
	}, [proofStatus]);

	const headerBasedOnStep: {
		[key in SubmitProofModalSteps]: { header: string; subtitle: string };
	} = {
		"claim-nft": {
			header: "Mint NFT",
			subtitle: "You need to mint an NFT to start participating",
		},
		deposit: {
			header: "Deposit into Aligned",
			subtitle:
				"You need to deposit ETH into Aligned in order to verify your proofs.",
		},
		submit: {
			header: "Submit your proof",
			subtitle:
				"Submit your game solution proof to Aligned to be verified.",
		},
		claim: {
			header: "Claim your points",
			subtitle: "Claim your points into the Leaderboard.",
		},
	};

	const modalBasedOnStep: {
		[key in SubmitProofModalSteps]: () => React.ReactNode;
	} = {
		"claim-nft": () => (
			<ClaimNft
				nft_contract_address={nft_contract_address}
				user_address={user_address}
				setOpen={modal.setOpen}
				updateState={goToNextStep}
			/>
		),
		deposit: () => (
			<DepositStep
				payment_service_address={payment_service_address}
				user_address={user_address}
				setOpen={modal.setOpen}
				updateState={goToNextStep}
				setDepositStatus={setDepositStatus}
			/>
		),
		submit: () => (
			<SubmitProofStep
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_addr={payment_service_address}
				setOpen={modal.setOpen}
				setStep={setStep}
				user_address={user_address}
				proofSubmission={proof}
				proofStatus={proofStatus}
				setProofStatus={setProofStatus}
				proofToSubmitData={proofToSubmitData}
				gameName={gameName ? gameName : proof?.game || "beast"}
				initialGameIdx={gameIdx}
				highestLevelReached={highestLevelReached}
				currentLevelReached={currentLevelReached}
				highestLevelReachedProofId={highestLevelReachedProofId}
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
					claimExpiryLabel={expiresInLabel}
					claimExpiryUtc={claimExpiryDateUtc}
				/>
			),
	};

	useEffect(() => {
		if (step === "deposit") {
			if (Number(formatEther(balance.data || BigInt(0))) < 0.001) {
				setDepositStatus("warn");
			}
		} else if (step === "claim-nft") {
			setDepositStatus("neutral");
		} else {
			setDepositStatus("success");
		}

		if (step === "claim-nft") {
			// This is true if data exists and is non zero
			if (nftBalance.data) {
				setClaimNftStatus("success");
			} else {
				setClaimNftStatus("warn");
			}
		} else {
			setClaimNftStatus("success");
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
	}, [step, proofStatus, balance.data, nftBalance.data]);

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

				<div className="flex overflow-x-scroll gap-8 w-full">
					<BreadCrumb
						step="Mint NFT"
						active={true}
						status={claimNftStatus}
					/>
					<BreadCrumb
						step="Deposit"
						active={step !== "claim-nft"}
						status={depositStatus}
					/>
					<BreadCrumb
						step="Submit Proof"
						active={step === "submit" || step === "claim"}
						status={submissionStatus}
					/>
					<BreadCrumb
						step="Claim Points"
						// Check if the game is outdated and not claimed and mark as failed
						active={step === "claim"}
						status={
							proofStatus === "claimed" ? "success" : "neutral"
						}
					/>
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
