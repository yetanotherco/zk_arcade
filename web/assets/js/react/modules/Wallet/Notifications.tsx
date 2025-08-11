import React, { useEffect, useRef, useState } from "react";
import { ProofSubmission, SubmitProof } from "../../types/aligned";
import { timeAgoInHs } from "../../utils/date";
import { Button } from "../../components";
import { toHex } from "viem";
import { fetchProofVerificationData } from "../../utils/aligned";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { useAligned, useLeaderboardContract } from "../../hooks";
import { Address } from "../../types/blockchain";

type Props = {
	proofs: ProofSubmission[];
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
};

const textBasedOnNotEntry = {
	pending: (commitment: string) => (
		<>
			The proof <span className="font-bold">{commitment}</span> is pending; you can retry the submission by bumping the fee
		</>
	),
	submitted: (commitment: string) => (
		<>
			The proof <span className="font-bold">{commitment}</span> is ready
			to be submitted`
		</>
	),
};

const NotificationEntry = ({
	proof,
	leaderboard_address,
	payment_service_address,
	user_address,
}: {
	proof: ProofSubmission;
	leaderboard_address: Address;
	payment_service_address: Address;
	user_address: Address;
}) => {
	const [proofCommitment, setProofCommitment] = useState("");
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

	const handleClick = async () => {
		if (proof.status === "submitted") {
			if (!proof.batch_hash) {
				alert("Batch data not available for this proof");
				return;
			}

			await submitSolution.submitBeastSolution(proof);
			return;
		}

		if (proof.status === "pending") {
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
		<div className="flex flex-row w-full items-end justify-between gap-4">
			<div className="flex items-center gap-4">
				<div
					className={`rounded-full h-[10px] w-[10px] ${
						proof.status === "submitted"
							? "bg-accent-100"
							: "bg-orange"
					} shrink-0`}
				></div>
				<p className="text-sm text-text-100">
					{textBasedOnNotEntry[proof.status](proofCommitment)}
				</p>
			</div>
			<Button
				variant="text-accent"
				className="text-sm text-nowrap"
				onClick={handleClick}
				isLoading={
					submitProofMessageLoading ||
					submitSolution.receipt.isLoading ||
					submitSolution.submitSolutionFetchingVDataIsLoading
				}
			>
				{proof.status === "submitted" ? "Submit" : "Bump fee"}
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
		</div>
	);
};

export const NotificationBell = ({
	proofs,
	leaderboard_address,
	payment_service_address,
	user_address,
}: Props) => {
	const [proofsReady, setProofsReady] = useState<ProofSubmission[]>([]);
	const [allProofs, setAllProofs] = useState<ProofSubmission[]>([]);

	useEffect(() => {
		const proofsReady = proofs.filter(
			proof => proof.status === "submitted"
		);

		const allProofs = proofs.filter(
			proof => proof.status === "submitted" || proof.status === "pending"
		);

		setProofsReady(proofsReady);
		setAllProofs(allProofs);
	}, [proofs, setProofsReady]);

	return (
		<div className="sm:relative group">
			<div className="relative">
				<span className="hero-bell size-7"></span>
				{proofsReady.length > 0 && (
					<div className="rounded-full h-[10px] w-[10px] bg-accent-100 absolute top-0 left-0"></div>
				)}
			</div>

			<div className="pt-2">
				<div className="flex flex-col gap-8 p-8 absolute max-sm:left-0 sm:w-[400px] w-full sm:right-0 shadow-2xl bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10">
					<div>
						<h1 className="text-text-100 text-lg mb-2">
							Notifications
						</h1>
						<p className="text-sm text-text-200">
							Get the status of your proofs
						</p>
					</div>
					<div
						className="overflow-scroll flex flex-col gap-4"
						style={{ maxHeight: 200 }}
					>
						{allProofs.length > 0 ? (
							allProofs.map(proof => (
								<NotificationEntry
									proof={proof}
									leaderboard_address={leaderboard_address}
									payment_service_address={
										payment_service_address
									}
									user_address={user_address}
								/>
							))
						) : (
							<p className="text-sm text-text-200">
								No updates at the moment. We'll notify you if
								there are any changes to the status of your
								proofs.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
