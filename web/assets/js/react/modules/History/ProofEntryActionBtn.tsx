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
	submitted: "Claim points",
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

	const { signVerificationData } = useAligned();

	const [bumpOpen, setBumpOpen] = useState(false);
	const [bumpLoading, setBumpLoading] = useState(false);

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

	const handleConfirmBump = async (chosenWei: bigint) => {
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
		} finally {
			setSubmitProofMessageLoading(false);
		}
	};

	const handleBumpError = (message: string) => {
		addToast({
			title: "Error",
			desc: message,
			type: "error",
		});
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
				onConfirm={handleConfirmBump}
				onError={handleBumpError}
				isConfirmLoading={submitProofMessageLoading}
			/>
		</td>
	);
};
