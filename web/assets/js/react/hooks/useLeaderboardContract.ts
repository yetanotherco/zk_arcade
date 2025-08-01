import React, { useCallback, useEffect, useState } from "react";
import { Address } from "../types/blockchain";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { leaderboardAbi } from "../constants/aligned";
import { ProofSubmission } from "../types/aligned";
import {
	computeVerificationDataCommitment,
	fetchProofVerificationData,
} from "../utils/aligned";
import { bytesToHex, keccak256, encodePacked } from "viem";

import { useToast } from "../state/toast";

type Args = {
	userAddress: Address;
	contractAddress: Address;
};

function getBeastKey(user: `0x${string}`, game: bigint): `0x${string}` {
	if (!user) {
		return "0x0";
	}
	const gameHash = keccak256(encodePacked(["uint256"], [game]));
	const beastKey = keccak256(
		encodePacked(["address", "bytes32"], [user, gameHash])
	);
	return beastKey;
}

export const useLeaderboardContract = ({
	contractAddress,
	userAddress,
}: Args) => {
	const chainId = useChainId();
	const [
		submitSolutionFetchingVDataIsLoading,
		setSubmitSolutionFetchingVDataIsLoading,
	] = useState(false);

	const score = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "getUserScore",
		args: [userAddress],
		chainId,
	});

	const currentGame = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "getCurrentBeastGame",
		args: [],
		chainId,
	});

	const currentGameLevelCompleted = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "usersBeastLevelCompleted",
		args: [
			getBeastKey(userAddress, currentGame.data?.gameConfig || BigInt(0)),
		],
		chainId,
	});

	const { addToast } = useToast();

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const submitBeastSolution = useCallback(
		async (proof: ProofSubmission) => {
			setSubmitSolutionFetchingVDataIsLoading(true);
			const res = await fetchProofVerificationData(proof.id);
			setSubmitSolutionFetchingVDataIsLoading(false);
			if (!res) {
				alert(
					"There was a problem while sending the proof, please try again"
				);
				return;
			}

			const {
				verification_data: { verificationData },
				batch_data,
			} = res;

			if (!batch_data) {
				alert("Proof hasn't been verified, try again later");
				return;
			}

			const commitment =
				computeVerificationDataCommitment(verificationData);

			const merkleRoot = bytesToHex(batch_data.batch_merkle_root);

			const hexPath: string[] =
				batch_data.batch_inclusion_proof.merkle_path.map(
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
				batch_data.index_in_batch,
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

	useEffect(() => {
		if (txRest.isSuccess) {
			addToast({
				title: "Solution verified",
				desc: "Your proof was submitted and verified successfully, waiting for receipt....",
				type: "success",
			});
		}

		if (txRest.isError) {
			addToast({
				title: "Solution failed",
				desc: "The transaction was sent but the verification failed.",
				type: "error",
			});
		}
	}, [txRest.isSuccess, txRest.isError]);

	useEffect(() => {
		if (receipt.isError) {
			addToast({
				title: "Receipt error",
				desc: "Failed to retrieve receipt from the transaction.",
				type: "error",
			});
		}

		if (receipt.isSuccess) {
			addToast({
				title: "Receipt received",
				desc: "Your solution receipt has been received, your score has been updated.",
				type: "success",
			});
		}
	}, [receipt.isLoading, receipt.isError]);

	return {
		score,
		submitSolution: {
			submitBeastSolution,
			submitSolutionFetchingVDataIsLoading,
			receipt,
			tx: {
				hash: txHash,
				...txRest,
			},
		},
		currentGameLevelCompleted,
		currentGame: {
			...currentGame,
			gamesHaveFinished:
				currentGame.error?.message?.includes("NoActiveBeastGame"),
		},
	};
};
