import React, { useEffect, useRef, useState } from "react";
import {
	NoncedVerificationdata,
	ProofSubmission,
	SubmitProof,
} from "../../types/aligned";
import { Button } from "../../components";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { Address } from "../../types/blockchain";
import { useAligned, useLeaderboardContract } from "../../hooks";
import { toHex } from "viem";
import { fetchProofVerificationData } from "../../utils/aligned";
import { BumpFeeModal } from "../../components/Modal/BumpFee";
import { useToast } from "../../state/toast";

const actionBtn: { [key in ProofSubmission["status"]]: string } = {
	claimed: "Share",
	submitted: "Submit solution",
	pending: "Bump fee",
	failed: "None",
};

type Props = {
	proof: ProofSubmission;
	user_address: Address;
	payment_service_address: Address;
	leaderboard_address: Address;
};

type BumpChoice = "instant" | "default" | "custom";

export const ProofEntryActionBtn = ({
	proof,
	user_address,
	leaderboard_address,
	payment_service_address,
}: Props) => {
	const { csrfToken } = useCSRFToken();
	const formRetryRef = useRef<HTMLFormElement>(null);
	const formSubmittedRef = useRef<HTMLFormElement>(null);
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submitProofMessageLoading, setSubmitProofMessageLoading] =
		useState(false);

	const { addToast } = useToast();
	const { submitSolution } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	const [bumpOpen, setBumpOpen] = useState(false);
	const [bumpLoading, setBumpLoading] = useState(false);
	const [choice, setChoice] = useState<BumpChoice>("default");
	const [customGwei, setCustomGwei] = useState<string>("");

	const [defaultFeeWei, setDefaultFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);

	const toWeiFromGwei = (gweiStr: string): bigint | null => {
		if (!gweiStr.trim()) return null;
		const n = Number(gweiStr);
		if (!isFinite(n) || n <= 0) return null;
		return BigInt(Math.floor(n * 1e9));
	};
	const toGwei = (wei: bigint) => Number(wei) / 1e9;

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formSubmittedRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const handleBtnClick = async () => {
		if (proof.status === "failed") {
			// nothing to do
			return;
		}

		if (proof.status === "claimed") {
			const text = encodeURIComponent(
				"🟩 I just claimed my points on zk-arcade!\n\n"
			);
			const url = encodeURIComponent("Try: https://zkarcade.com\n\n");
			const hashtags = `\naligned,proof,${proof.proving_system}`;
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

			window.open(twitterShareUrl, "_blank");

			return;
		}

		if (proof.status === "submitted") {
			if (!proof.batch_hash) {
				addToast({
				title: "Batch not available",
				desc: "Batch data not available for this proof",
				type: "error",
				});
				return;
			}

			await submitSolution.submitBeastSolution(proof);
			return;
		}

		if (proof.status === "pending") {
			try {
				setBumpLoading(true);
				const estimatedDefault = await estimateMaxFeeForBatchOfProofs(16); // The default is the max fee passed first
				const estimatedInstant = await estimateMaxFeeForBatchOfProofs(1);
				if (!estimatedDefault) {
					addToast({
						title: "Could not estimate the fee",
						desc: "Please try again in a few seconds.",
						type: "error",
					});
					setBumpLoading(false);
					return;
				}
				setDefaultFeeWei(estimatedDefault);
				setInstantFeeWei(estimatedInstant);
				setChoice("default");
				setCustomGwei("");
				setBumpOpen(true);
			} catch {
				addToast({
					title: "Could not estimate the fee",
					desc: "Please try again in a few seconds.",
					type: "error",
				});
			} finally {
				setBumpLoading(false);
			}
		}
	};

	const handleConfirmBump = async () => {
		try {
			setSubmitProofMessageLoading(true);

			const res = await fetchProofVerificationData(proof.id);
			if (!res) {
				addToast({
					title: "There was a problem while sending the proof",
					desc: "Please try again.",
					type: "error",
				});
				setSubmitProofMessageLoading(false);
				return;
			}
			const noncedVerificationData: NoncedVerificationdata = res.verification_data;

			let chosenWei: bigint | null = null;
			if (choice === "default") chosenWei = defaultFeeWei;
			else if (choice === "instant") chosenWei = instantFeeWei;
			else if (choice === "custom") chosenWei = toWeiFromGwei(customGwei);

			if (!chosenWei || chosenWei <= 0n) {
				addToast({
				title: "Invalid fee",
				desc: "Please enter a value greater than 0 Gwei.",
				type: "error",
				});
				setSubmitProofMessageLoading(false);
				return;
			}

			noncedVerificationData.maxFee = toHex(chosenWei, { size: 32 });

			const { r, s, v } = await signVerificationData(
				noncedVerificationData,
				payment_service_address
			);

			const submitProofMessage: SubmitProof = {
				verificationData: noncedVerificationData,
				signature: {
					r,
					s,
					v: Number(v),
				},
			};

			setSubmitProofMessage(JSON.stringify(submitProofMessage));

			addToast({
				title: "Retrying submission",
				desc: "Using the newly selected fee...",
				type: "success",
			});

			setBumpOpen(false);
			window.setTimeout(() => {
				formRetryRef.current?.submit();
			}, 1000);
		} catch {
			addToast({
				title: "Could not apply the bump",
				desc: "Please try again in a few seconds.",
				type: "error",
			});
			setSubmitProofMessageLoading(false);
		}
	};

	return (
		<td>
			<div className="relative group/proof-history-item w-full">
				<Button
					variant="contrast"
					className="text-nowrap text-sm w-full"
					disabled={proof.status === "failed"}
					style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 8, paddingBottom: 8 }}
					onClick={handleBtnClick}
					isLoading={
						submitSolution.submitSolutionFetchingVDataIsLoading ||
						submitSolution.receipt.isLoading ||
						submitProofMessageLoading ||
						bumpLoading
					}
				>
					{actionBtn[proof.status]}
				</Button>
			</div>

			{proof.status === "pending" && (
				<form
					ref={formRetryRef}
					action="/proof/status/retry"
					method="post"
					className="hidden"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input
						type="hidden"
						name="submit_proof_message"
						value={submitProofMessage}
					/>
					<input type="hidden" name="proof_id" value={proof.id} />
				</form>
			)}
			{proof.status === "submitted" && (
				<form
					className="hidden"
					ref={formSubmittedRef}
					action="/proof/status/submitted"
					method="POST"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input type="hidden" name="proof_id" value={proof.id} />
				</form>
			)}

			<BumpFeeModal
				open={bumpOpen}
				setOpen={setBumpOpen}
				defaultFeeWei={defaultFeeWei}
				instantFeeWei={instantFeeWei}
				choice={choice}
				setChoice={setChoice}
				customGwei={customGwei}
				setCustomGwei={setCustomGwei}
				toWeiFromGwei={toWeiFromGwei}
				toGwei={toGwei}
				onConfirm={handleConfirmBump}
				isConfirmLoading={submitProofMessageLoading}
			/>
		</td>
	);
};
