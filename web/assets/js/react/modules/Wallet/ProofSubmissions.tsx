import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProofSubmission, SubmitProof } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import { bytesToHex, toHex } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { Button } from "../../components";
import { useAccount } from "wagmi";
import { useLeaderboardContract, useAligned } from "../../hooks";
import { useToast } from "../../state/toast";
import { useCSRFToken } from "../../hooks/useCSRFToken";

const colorBasedOnStatus: { [key in ProofSubmission["status"]]: string } = {
	submitted: "text-accent-100",
	pending: "text-yellow",
	claimed: "text-blue",
	failed: "text-red",
};

const btnText: { [key in ProofSubmission["status"]]: string } = {
	submitted: "Submit solution",
	claimed: "Already submitted to leaderboard",
	pending:
		"You need to wait until its verified before submitting the solution",
	failed: "The proof failed to be verified, you have to re-send it",
};

const statusText: { [key in ProofSubmission["status"]]: string } = {
	claimed: "Claimed",
	submitted: "Ready",
	pending: "Pending",
	failed: "Failed",
};

const Proof = ({
	proof,
	leaderboard_address,
}: {
	proof: ProofSubmission;
	leaderboard_address: Address;
}) => {
	const { csrfToken } = useCSRFToken();
	const formRefSubmitted = useRef<HTMLFormElement>(null);
	const formRefRetry = useRef<HTMLFormElement>(null);
	const { address } = useAccount();
	const { addToast } = useToast();
	const { submitSolution, score } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: address || "0x0",
	});
	const [submitProofMessage, setSubmitProofMessage] = useState("");

	const merkleRoot = bytesToHex(
		proof.batchData?.batch_merkle_root || Uint8Array.from([])
	);

	const merkleRootHash = `${merkleRoot.slice(0, 2)}...${merkleRoot.slice(
		-4
	)}`;

	const commitment = computeVerificationDataCommitment(
		proof.verificationData.verificationData
	);

	const proofHash = bytesToHex(commitment.commitmentDigest);

	const proofHashShorten = `${proofHash.slice(0, 2)}...${proofHash.slice(
		-4
	)}`;

	const handleSubmitProof = async () => {
		if (!proof.batchData) {
			alert("Batch data not available for this proof");
			return;
		}

		await submitSolution.submitBeastSolution(
			proof.verificationData.verificationData,
			proof.batchData
		);
	};

	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();


	// Here and in the Retry button, we control that retry is only available for proofs that are in "pending" status, but
	// we can also do this for proofs that are in "failed" status, as they can be retried too.
	// Note that the "failed" proofs are those that were sent but the verification failed after 10 seconds.
	const handleRetrySubmitProof = useCallback(async () => {
		if (proof.status !== "pending") {
			alert("You can only retry submitting a proof that is in 'pending' status");
			return;
		}

		const maxFee = await estimateMaxFeeForBatchOfProofs(16);
		if (!maxFee) {
			alert("Could not estimate max fee");
			return;
		}

		proof.verificationData.maxFee = toHex(maxFee, { size: 32 });

		const { r, s, v } = await signVerificationData(proof.verificationData);

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
			formRefRetry.current?.submit();
		}, 100);
	}, [proof, estimateMaxFeeForBatchOfProofs, signVerificationData]);

	useEffect(() => {
		if (submitSolution.tx.isSuccess) {
			addToast({
				title: "Solution verified",
				desc: "Your proof was submitted and verified successfully, waiting for receipt....",
				type: "success",
			});
		}

		if (submitSolution.tx.isError) {
			addToast({
				title: "Solution failed",
				desc: "The transaction was sent but the verification failed.",
				type: "error",
			});
		}
	}, [submitSolution.tx.isSuccess, submitSolution.tx.isError]);

	useEffect(() => {
		if (submitSolution.receipt.isError) {
			addToast({
				title: "Receipt error",
				desc: "Failed to retrieve receipt from the transaction.",
				type: "error",
			});
		}

		if (submitSolution.receipt.isSuccess) {
			addToast({
				title: "Receipt received",
				desc: "Your solution receipt has been received, your score has been updated.",
				type: "success",
			});
			window.setTimeout(() => {
				formRefSubmitted.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt.isLoading, submitSolution.receipt.isError]);

	return (
		<>
			<tr>
				<td>{proof.game}</td>
				<td className={colorBasedOnStatus[proof.status]}>
					{statusText[proof.status]}
				</td>
				<td>
					{proof.batchData?.batch_merkle_root ? (
						<a
							href={`https://explorer.alignedlayer.com/batches/${merkleRoot}`}
							className="underline"
						>
							{merkleRootHash}
						</a>
					) : (
						<>...</>
					)}
				</td>
				<td>{proofHashShorten}</td>
				<td>
					{proof.status === "pending" && (
						<>
							<Button
								variant="text-accent"
								className="text-sm"
								onClick={handleRetrySubmitProof}
							>
								Retry
							</Button>
							<form
								ref={formRefRetry}
								action="/proof/status/retry"
								method="post"
								className="hidden"
							>
								<input
									type="hidden"
									name="submit_proof_message"
									value={submitProofMessage}
								/>
								<input
									type="hidden"
									name="_csrf_token"
									value={csrfToken}
								/>
								<input
									type="hidden"
									name="proof_id"
									value={proof.id}
								/>
							</form>
						</>
					)}
				</td>
			</tr>

			<tr>
				<td colSpan={100}>
					<Button
						variant="text-accent"
						className={`text-sm w-full ${
							proof.status !== "submitted" ? "text-text-200" : ""
						}`}
						disabled={proof.status !== "submitted"}
						onClick={handleSubmitProof}
					>
						{submitSolution.tx.isPending ||
						submitSolution.receipt.isLoading
							? "Sending..."
							: btnText[proof.status]}
					</Button>
					{proof.status == "submitted" && (
						<form
							className="hidden"
							ref={formRefSubmitted}
							action="/proof/status/submitted"
							method="POST"
						>
							<input
								type="hidden"
								name="_csrf_token"
								value={csrfToken}
							/>
							<input
								type="hidden"
								name="proof_id"
								value={proof.id}
							/>
						</form>
					)}
				</td>
			</tr>
		</>
	);
};

type Props = {
	proofs: ProofSubmission[];
	leaderboard_address: Address;
};

export const ProofSubmissions = ({
	proofs = [],
	leaderboard_address,
}: Props) => {
	return (
		<div>
			<h3 className="text-md font-bold mb-2">Your Proof Submissions:</h3>
			<div className="overflow-scroll" style={{ maxHeight: 150 }}>
				{proofs.length > 0 ? (
					<div>
						<table className="w-full text-left">
							<thead className="text-text-200 text-sm">
								<tr>
									<th>Game</th>
									<th>Status</th>
									<th>Batch</th>
									<th>Proof hash</th>
								</tr>
							</thead>
							<tbody className="text-text-100 text-sm">
								{proofs.reverse().map(proof => (
									<Proof
										key={proof.id}
										proof={proof}
										leaderboard_address={
											leaderboard_address
										}
									/>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="text-sm">
						You don't have any submission for now...
					</p>
				)}
			</div>
		</div>
	);
};
