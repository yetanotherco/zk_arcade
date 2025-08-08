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
import { useToast } from "../../state/toast";

const actionBtn: { [key in ProofSubmission["status"]]: string } = {
	claimed: "Share",
	submitted: "Claim points",
	pending: "None",
	failed: "None",
	underpriced: "Bump fee",
};

type Props = {
	proof: ProofSubmission;
	user_address: Address;
	payment_service_address: Address;
	leaderboard_address: Address;
};

export const ProofEntryActionBtn = ({
	proof,
	user_address,
	leaderboard_address,
	payment_service_address,
}: Props) => {
	const { csrfToken } = useCSRFToken();
	const { addToast } = useToast();
	const formRetryRef = useRef<HTMLFormElement>(null);
	const formSubmittedRef = useRef<HTMLFormElement>(null);
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submitProofMessageLoading, setSubmitProofMessageLoading] =
		useState(false);

	const { submitSolution } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

	const { currentGame } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formSubmittedRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const handleBtnClick = async () => {
		const submittedGameConfigBigInt = BigInt("0x" + proof.game_config);
		const currentGameConfigBigInt = BigInt(currentGame.data?.gameConfig || 0n);

		if (submittedGameConfigBigInt !== currentGameConfigBigInt) {
			addToast({
				title: "Game mismatch",
				desc: "Current game has changed since the proof was created",
				type: "error",
			});
			console.log("Proof game config:", proof.game_config);
			console.log("Current game config:", currentGame.data?.gameConfig);
			return;
		}

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
				alert("Batch data not available for this proof");
				return;
			}

			await submitSolution.submitBeastSolution(proof);
			return;
		}

		if (proof.status === "underpriced") {
			const res = await fetchProofVerificationData(proof.id);
			if (!res) {
				alert(
					"There was a problem while sending the proof, please try again"
				);
				return;
			}

			const noncedVerificationData = res.verification_data;
			const maxFee = await estimateMaxFeeForBatchOfProofs(16);
			if (!maxFee) {
				alert("Could not estimate max fee");
				return;
			}
			noncedVerificationData.maxFee = toHex(maxFee, { size: 32 });

			setSubmitProofMessageLoading(true);
			try {
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

				window.setTimeout(() => {
					formRetryRef.current?.submit();
				}, 1000);
			} catch {
				setSubmitProofMessageLoading(false);
			}
		}
	};

	return (
		<td>
			<div className="relative group/proof-history-item w-full">
				<Button
					variant="contrast"
					className="text-nowrap text-sm w-full"
					disabled={
						proof.status === "failed" || proof.status === "pending"
					}
					style={{
						paddingLeft: 0,
						paddingRight: 0,
						paddingTop: 8,
						paddingBottom: 8,
					}}
					onClick={handleBtnClick}
					isLoading={
						submitSolution.submitSolutionFetchingVDataIsLoading ||
						submitSolution.receipt.isLoading ||
						submitProofMessageLoading
					}
				>
					{actionBtn[proof.status]}
				</Button>
			</div>

			{proof.status === "underpriced" && (
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
			{proof.status == "submitted" && (
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
		</td>
	);
};
