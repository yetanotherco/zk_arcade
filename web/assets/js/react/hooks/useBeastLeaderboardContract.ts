import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Address } from "../types/blockchain";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { leaderboardAbi } from "../constants/aligned";
import { ProofSubmission } from "../types/aligned";
import {
	computeVerificationDataCommitment,
	fetchProofVerificationData,
} from "../utils/aligned";
import { bytesToHex, keccak256, encodeAbiParameters } from "viem";

import { useToast } from "../state/toast";

type Args = {
	userAddress: Address;
	contractAddress: Address;
};

function getBeastKey(user: `0x${string}`, game: bigint): `0x${string}` {
	if (!user) {
		return "0x0";
	}
	const beastKey = keccak256(
		encodeAbiParameters(
			[{ type: "address" }, { type: "uint256" }],
			[user, game]
		)
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

	const currentGameApi = useQuery({
		queryKey: ["beast-game", "current"],
		queryFn: async () => {
			const response = await fetch("/api/games/beast/current");
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw new Error("Failed to fetch current Beast game");
			}
			return response.json();
		},
		refetchInterval: 30000,
	});

	const currentGame = useMemo(() => ({
		data: currentGameApi.data ? [
			{
				gameConfig: currentGameApi.data.game_config,
				startsAtTime: BigInt(new Date(currentGameApi.data.starts_at).getTime() / 1000),
				endsAtTime: BigInt(new Date(currentGameApi.data.ends_at).getTime() / 1000),
			},
			BigInt(currentGameApi.data.game_index)
		] : null,
		isLoading: currentGameApi.isLoading,
		error: currentGameApi.error,
	}), [currentGameApi.data, currentGameApi.isLoading, currentGameApi.error]);

	// Used to calculate the time remaining for the current game
	const nextGameApi = useQuery({
		queryKey: ["beast-game", "next", currentGameApi.data?.game_index],
		queryFn: async () => {
			if (!currentGameApi.data) return null;
			const nextIndex = currentGameApi.data.game_index + 1;
			const response = await fetch(`/api/games/beast/${nextIndex}`);
			if (response.status === 404) {
				return null;
			}
			if (!response.ok) {
				throw new Error("Failed to fetch next Beast game");
			}
			return response.json();
		},
		enabled: !!currentGameApi.data,
		refetchInterval: 30000,
	});

	const nextGame = useMemo(() => ({
		data: nextGameApi.data ? {
			gameConfig: nextGameApi.data.game_config,
			startsAtTime: BigInt(new Date(nextGameApi.data.starts_at).getTime() / 1000),
			endsAtTime: BigInt(new Date(nextGameApi.data.ends_at).getTime() / 1000),
		} : null,
		isLoading: nextGameApi.isLoading,
		error: nextGameApi.error,
	}), [nextGameApi.data, nextGameApi.isLoading, nextGameApi.error]);

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

	const { writeContractAsync, data: txHash, isPending, ...txRest } = useWriteContract();
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

	const isClaimLoading = isPending || receipt.isLoading || submitSolutionFetchingVDataIsLoading;

	return {
		score,
		submitSolution: {
			claimBeastPoints,
			receipt,
			tx: {
				hash: txHash,
				...txRest,
			},
			isLoading: isClaimLoading,
		},
		currentGameLevelCompleted,
		currentGame: {
			...currentGame,
			game: currentGame.data ? currentGame.data[0] : null,
			gameIdx: currentGame.data ? currentGame.data[1] : null,
			gamesHaveFinished: currentGameApi.data === null && !currentGameApi.isLoading,
		},
		nextGame,
	};
};
