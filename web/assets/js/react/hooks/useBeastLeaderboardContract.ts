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

export const useBeastLeaderboardContract = ({
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
			getBeastKey(
				userAddress,
				currentGame.data ? currentGame.data[0].gameConfig : 0n
			),
		],
		chainId,
	});

	const { addToast } = useToast();

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const claimBeastPoints = useCallback(
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
				game_idx,
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
				game_idx,
				bytesToHex(commitment.proofCommitment, { size: 32 }),
				bytesToHex(Uint8Array.from(verificationData.publicInput || [])),
				verificationData.proofGeneratorAddress,
				merkleRoot,
				encodedMerkleProof,
				batch_data.index_in_batch,
			];

			await writeContractAsync({
				address: contractAddress,
				functionName: "claimBeastPoints",
				abi: leaderboardAbi,
				args,
			});
		},
		[writeContractAsync]
	);

	useEffect(() => {
		if (txRest.isSuccess) {
			addToast({
				title: "Claiming points",
				desc: "Your proof was submitted successfully, waiting for receipt....",
				type: "success",
			});
		}

		if (txRest.isError) {
			addToast({
				title: "Claim failed",
				desc: "The transaction failed.",
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
				title: "Points claimed",
				desc: "Your solution receipt has been received, your score has been updated.",
				type: "success",
			});
		}
	}, [receipt.isLoading, receipt.isError]);

	return {
		score,
		submitSolution: {
			claimBeastPoints,
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
			game: currentGame.data ? currentGame.data[0] : null,
			gameIdx: currentGame.data ? currentGame.data[1] : null,
			gamesHaveFinished:
				currentGame.error?.message?.includes("NoActiveBeastGame"),
		},
	};
};
