import React, { useCallback } from "react";
import { Address } from "../types/blockchain";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { leaderboardAbi } from "../constants/aligned";
import { BatchInclusionData, VerificationData } from "../types/aligned";
import { computeVerificationDataCommitment } from "../utils/aligned";
import { bytesToHex } from "viem";

type Args = {
	userAddress: Address;
	contractAddress: Address;
};

export const useLeaderboardContract = ({
	contractAddress,
	userAddress,
}: Args) => {
	const chainId = useChainId();

	const score = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "getUserScore",
		args: [userAddress],
		chainId,
	});

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const submitBeastSolution = useCallback(
		async (
			verificationData: VerificationData,
			batchData: BatchInclusionData
		) => {
			const commitment =
				computeVerificationDataCommitment(verificationData);

			const merkleRoot = bytesToHex(batchData.batch_merkle_root);

			const hexPath: string[] =
				batchData.batch_inclusion_proof.merkle_path.map(
					p => `${Buffer.from(p).toString("hex")}`
				);
			const encodedMerkleProof = `0x${hexPath.join("")}`;

			const args = [
				bytesToHex(commitment.proofCommitment, { size: 32 }),
				bytesToHex(Uint8Array.from(verificationData.publicInput || [])),
				bytesToHex(commitment.provingSystemAuxDataCommitment, {
					size: 32,
				}),
				verificationData.proofGeneratorAddress,
				merkleRoot,
				encodedMerkleProof,
				batchData.index_in_batch,
			];

			await writeContractAsync({
				address: contractAddress,
				functionName: "submitBeastSolution",
				abi: leaderboardAbi,
				args,
			});
		},
		[writeContractAsync]
	);

	return {
		score,
		submitSolution: {
			submitBeastSolution,
			receipt,
			tx: {
				hash: txHash,
				...txRest,
			},
		},
	};
};
