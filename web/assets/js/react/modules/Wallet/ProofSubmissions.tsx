import React from "react";
import { ProofSubmission } from "../../types/aligned";
import { bytesToHex } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { Button } from "../../components";

type Props = {
	proofs: ProofSubmission[];
};

const Proof = ({ proof }: { proof: ProofSubmission }) => {
	const colorBasedOnStatus: { [key in ProofSubmission["status"]]: string } = {
		verified: "text-accent-100",
		"submitted-to-leaderboard": "text-blue",
		pending: "text-yellow",
	};

	const merkleRoot = bytesToHex(
		proof.batchData?.batch_merkle_root || Uint8Array.from([])
	);

	const merkleRootHash = `${merkleRoot.slice(0, 2)}...${merkleRoot.slice(
		-4
	)}`;

	const proofHash = bytesToHex(
		computeVerificationDataCommitment(
			proof.verificationData.verificationData
		)
	);

	const proofHashShorten = `${proofHash.slice(0, 2)}...${proofHash.slice(
		-4
	)}`;

	const handleSubmitProof = () => {};

	const btnText: { [key in ProofSubmission["status"]]: string } = {
		verified: "Submit solution",
		"submitted-to-leaderboard": "Already submitted to leaderboard",
		pending:
			"You need to wait until its verified before submitting the solution",
	};

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
						{btnText[proof.status]}
					</Button>
				</td>
			</tr>
		</>
	);
};

export const ProofSubmissions = ({ proofs = [] }: Props) => {
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
									<Proof key={proof.id} proof={proof} />
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
