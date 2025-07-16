import React from "react";
import { ProofSubmission } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import { bytesToHex, encodeAbiParameters } from "viem";
import { computeVerificationDataCommitment } from "../../utils/aligned";
import { Button } from "../../components";
import { useWriteContract } from "wagmi";
import { leaderboardAbi } from "../../constants/aligned";

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
	const { writeContractAsync, isPending, data, isSuccess, error, isError } =
		useWriteContract();

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
			return;
		}

		const hexPath: string[] =
			proof.batchData.batch_inclusion_proof.merkle_path.map(
				p => `${Buffer.from(p).toString("hex")}`
			);
		const encodedMerkleProof = `0x${hexPath.join("")}`;

		const args = [
			bytesToHex(commitment.proofCommitment, { size: 32 }),
			bytesToHex(
				Uint8Array.from(
					proof.verificationData.verificationData.publicInput || []
				),
				{ size: 32 }
			),
			bytesToHex(commitment.provingSystemAuxDataCommitment, {
				size: 32,
			}),
			proof.verificationData.verificationData.proofGeneratorAddress,
			merkleRoot,
			encodedMerkleProof,
			proof.batchData?.index_in_batch,
		];

		console.log("ARGS", args);

		// todo: here we would call base on proof.game
		await writeContractAsync({
			address: leaderboard_address,
			functionName: "submitBeastSolution",
			abi: leaderboardAbi,
			args,
		});
	};

	console.log("CONTRACT eRROR", error, data);

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
