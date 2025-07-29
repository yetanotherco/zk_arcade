import React, { useEffect, useRef, useState } from "react";
import { ProofSubmission, SubmitProof } from "../../types/aligned";
import { Button } from "../../components";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { Address } from "../../types/blockchain";
import { useAligned, useLeaderboardContract } from "../../hooks";
import { toHex } from "viem";

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

	const { submitSolution } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
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

	const handleBtnClick = (proof: ProofSubmission) => async () => {
		if (proof.status === "failed") {
			// nothing to do
			return;
		}

		if (proof.status === "claimed") {
			const text = encodeURIComponent(
				"🟩 I just claimed my proof on zk-arcade!\n\n"
			);
			const url = encodeURIComponent("Try: https://zkarcade.com\n\n");
			const hashtags = `\naligned,proof,${proof.verificationData.verificationData.provingSystem}`;
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

			window.open(twitterShareUrl, "_blank");

			return;
		}

		if (proof.status === "submitted") {
			if (!proof.batchData) {
				alert("Batch data not available for this proof");
				return;
			}

			await submitSolution.submitBeastSolution(
				proof.verificationData.verificationData,
				proof.batchData
			);
			return;
		}

		if (proof.status === "pending") {
			const maxFee = await estimateMaxFeeForBatchOfProofs(16);
			if (!maxFee) {
				alert("Could not estimate max fee");
				return;
			}
			proof.verificationData.maxFee = toHex(maxFee, { size: 32 });

			setSubmitProofMessageLoading(true);
			try {
				const { r, s, v } = await signVerificationData(
					proof.verificationData,
					payment_service_address
				);

				const submitProofMessage: SubmitProof = {
					verificationData: proof.verificationData,
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
			<Button
				variant="contrast"
				className="text-nowrap text-sm w-full"
				disabled={proof.status === "failed"}
				style={{
					paddingLeft: 0,
					paddingRight: 0,
				}}
				onClick={handleBtnClick(proof)}
				isLoading={
					submitSolution.receipt.isLoading ||
					submitProofMessageLoading
				}
			>
				{actionBtn[proof.status]}
			</Button>

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
