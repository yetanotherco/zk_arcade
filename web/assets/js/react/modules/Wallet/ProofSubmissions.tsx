import React, { useEffect } from "react";
import { ProofSubmission } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import { bytesToHex, encodeAbiParameters } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { Button } from "../../components";
import { useAccount, useWriteContract } from "wagmi";
import { leaderboardAbi } from "../../constants/aligned";
import { useLeaderboardContract } from "../../hooks/useLeaderboardContract";
import { useToast } from "../../state/toast";

const colorBasedOnStatus: { [key in ProofSubmission["status"]]: string } = {
	verified: "text-accent-100",
	"submitted-to-leaderboard": "text-blue",
	pending: "text-yellow",
};

const btnText: { [key in ProofSubmission["status"]]: string } = {
	verified: "Submit solution",
	"submitted-to-leaderboard": "Already submitted to leaderboard",
	pending:
		"You need to wait until its verified before submitting the solution",
};

const Proof = ({
	proof,
	leaderboard_address,
}: {
	proof: ProofSubmission;
	leaderboard_address: Address;
}) => {
	const { address } = useAccount();
	const { addToast } = useToast();
	const { submitSolution, score } = useLeaderboardContract({
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
			score.refetch();
		}
	}, [submitSolution.receipt.isLoading, submitSolution.receipt.isError]);

	return (
		<>
			<tr>
				<td>{proof.game}</td>
				<td className={colorBasedOnStatus[proof.status]}>
					{proof.status}
				</td>
				<td>
					<a
						href={`https://explorer.alignedlayer.com/batches/${merkleRoot}`}
						className="underline"
					>
						{merkleRootHash}
					</a>
				</td>
				<td>{proofHashShorten}</td>
			</tr>

			<tr>
				<td colSpan={100}>
					<Button
						variant="text"
						className="text-sm w-full"
						disabled={proof.status !== "verified"}
						onClick={handleSubmitProof}
					>
						{submitSolution.tx.isPending ||
						submitSolution.receipt.isLoading
							? "Sending..."
							: btnText[proof.status]}
					</Button>
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
			<div className="overflow-scroll" style={{ maxHeight: 200 }}>
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
