import React, { useCallback, useEffect, useRef, useState } from "react";
import { ProofSubmission, SubmitProof } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import { bytesToHex } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { Button } from "../../components";
import { useAccount } from "wagmi";
import { useLeaderboardContract } from "../../hooks";
import { useCSRFToken } from "../../hooks/useCSRFToken";

const colorBasedOnStatus: { [key in ProofSubmission["status"]]: string } = {
	submitted: "bg-accent-100/20 text-accent-100",
	pending: "bg-yellow/20 text-yellow",
	claimed: "bg-blue/20 text-blue",
	failed: "bg-red/20 text-red",
};

const tooltipStyleBasedOnStatus: {
	[key in ProofSubmission["status"]]: string;
} = {
	submitted: "bg-accent-100 text-black",
	pending: "bg-yellow text-black",
	claimed: "bg-blue text-white",
	failed: "bg-red text-white",
};

const tooltipText: { [key in ProofSubmission["status"]]: string } = {
	submitted: "Solution verified and ready to be submitted",
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
	const { address } = useAccount();
	const { submitSolution } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: address || "0x0",
	});

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

	return (
		<>
			<tr>
				<td>{proof.game}</td>
				<td>
					<div
						className={`relative group/tooltip flex flex-row gap-2 items-center rounded px-1 w-fit ${
							colorBasedOnStatus[proof.status]
						}`}
					>
						<span className="hero-information-circle solid size-5"></span>
						<p>{statusText[proof.status]}</p>

						<div
							className={`${
								tooltipStyleBasedOnStatus[proof.status]
							} rounded absolute rounded -left-1/2 top-full mb-2 text-sm rounded px-2 py-1 opacity-0 group-hover/tooltip:opacity-100 transition pointer-events-none`}
							style={{ width: 300, zIndex: 10000 }}
						>
							<p className="text-center text-xs">
								{tooltipText[proof.status]}
							</p>
						</div>
					</div>
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
			</tr>

			{proof.status == "submitted" && (
				<tr>
					<td colSpan={100}>
						<Button
							variant="text-accent"
							className={`text-sm w-full ${
								proof.status !== "submitted"
									? "text-text-200"
									: ""
							}`}
							disabled={proof.status !== "submitted"}
							onClick={handleSubmitProof}
						>
							{submitSolution.tx.isPending ||
							submitSolution.receipt.isLoading
								? "Sending..."
								: "Submit solution"}
						</Button>
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
					</td>
				</tr>
			)}
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
			<div className="flex justify-between mb-6">
				<h3 className="text-md font-bold">Your Proof Submissions:</h3>
				<div className="cursor-pointer group/proof-submission">
					<a
						href="/history"
						className="text-text-100 mr-2 text-sm group-hover/proof-submission:underline"
					>
						See all
					</a>
					<span className="hero-arrow-long-right size-5 transition group-hover/proof-submission:translate-x-0.5" />
				</div>
			</div>
			<div
				className="overflow-scroll"
				style={{ maxHeight: 150, minHeight: 100 }}
			>
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
								{proofs.map(proof => (
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
