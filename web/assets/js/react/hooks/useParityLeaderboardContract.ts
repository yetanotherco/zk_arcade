import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { Address } from "../types/blockchain";
import { leaderboardAbi } from "../constants/aligned";
import { bytesToHex, encodePacked, keccak256 } from "viem";
import { useCallback, useEffect, useState } from "react";
import { ProofSubmission } from "../types/aligned";
import {
	computeVerificationDataCommitment,
	fetchProofVerificationData,
} from "../utils/aligned";
import { useToast } from "../state/toast";

type Args = {
	contractAddress: Address;
	userAddress: Address;
};

function getParitytKey(user: `0x${string}`, game: bigint): `0x${string}` {
	if (!user) {
		return "0x0";
	}
	const gameHash = keccak256(encodePacked(["uint256"], [game]));
	const parityKey = keccak256(
		encodePacked(["address", "bytes32"], [user, gameHash])
	);
	return parityKey;
}

export const useParityLeaderboardContract = ({
	contractAddress,
	userAddress,
}: Args) => {
	const chainId = useChainId();

	const currentGame = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "getCurrentParityGame",
		args: [],
		chainId,
	});

	// Used to calculate the time remaining for the current game
	const nextGame = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "parityGames",
		args: [
			currentGame.data
				? currentGame.data[1] === 0
					? 0
					: currentGame.data[1] + 1n
				: -1,
		],
		chainId,
	});

	const currentGameLevelCompleted = useReadContract({
		address: contractAddress,
		abi: leaderboardAbi,
		functionName: "usersParityLevelCompleted",
		args: [
			getParitytKey(
				userAddress,
				currentGame.data ? currentGame.data[0].gameConfig : BigInt(0)
			),
		],
		chainId,
	});

	const { addToast } = useToast();
	const { writeContractAsync, data: txHash, isPending, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const claimParityPoints = useCallback(
		async (proof: ProofSubmission) => {
			const res = await fetchProofVerificationData(proof.id);
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
				functionName: "claimParityPoints",
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

	const isClaimLoading = isPending || receipt.isLoading;

	return {
		currentGame: {
			...currentGame,
			game: currentGame.data ? currentGame.data[0] : null,
			gameIdx: currentGame.data ? currentGame.data[1] : null,
			gamesHaveFinished:
				currentGame.error?.message?.includes("NoActiveParityGame"),
		},
		submitSolution: {
			claimParityPoints,
			receipt,
			tx: {
				hash: txHash,
				...txRest,
			},
			isLoading: isClaimLoading,
		},
		currentGameLevelCompleted,
		nextGame,
	};
};
