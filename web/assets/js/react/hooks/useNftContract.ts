import React, { useCallback, useEffect } from "react";
import { Address } from "viem";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
} from "wagmi";
import { useToast } from "../state/toast";
import { zkArcadeNftAbi } from "../constants/aligned";

type HookArgs = {
	userAddress: Address;
	contractAddress: Address;
};

type Proof = `0x${string}`[] | `0x${string}` | string;

// This function normalizes the proof input into an array of bytes32 strings.
function processRawMerkleProof(input: Proof): `0x${string}`[] {
	if (Array.isArray(input)) {
		return input as `0x${string}`[];
	}

	if (typeof input === "string") {
		const trimmed = input.trim();
		if (!trimmed) throw new Error("The merkle proof is empty");

		// Remove all 0x internal prefixes
		const hex = trimmed.replace(/0x/gi, "");

		if (hex.length % 64 !== 0) {
			throw new Error(
				"Invalid format: the proof must be a multiple of 64 hexadecimal characters"
			);
		}

		// Gets each bytes32 chunk and pushes it into the vec
		const result: `0x${string}`[] = [];
		for (let i = 0; i < hex.length; i += 64) {
			result.push(`0x${hex.slice(i, i + 64)}` as `0x${string}`);
		}
		return result;
	}

	throw new Error(
		"Unsupported proof format, use an array or hexadecimal string."
	);
}

export function useNftContract({ userAddress, contractAddress }: HookArgs) {
	const chainId = useChainId();
	const { addToast } = useToast();

	const balance = useReadContract({
		address: contractAddress,
		abi: zkArcadeNftAbi,
		functionName: "balanceOf",
		args: userAddress ? [userAddress] : undefined,
		chainId,
	});

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const claimNft = useCallback(
		async (
			tokenURI: string,
			proof: `0x${string}`[] | `0x${string}` | string
		) => {
			if (!userAddress) throw new Error("Wallet not connected");

			let merkleProofArray: `0x${string}`[];
			try {
				merkleProofArray = processRawMerkleProof(proof);
			} catch (e: any) {
				addToast({
					title: "Error in eligibility proof",
					desc: `Could not validate your eligibility to claim your NFT: ${String(
						e?.message || e
					)}`,
					type: "error",
				});
				return;
			}

			const hash = await writeContractAsync({
				address: contractAddress,
				abi: zkArcadeNftAbi,
				functionName: "claimNFT",
				args: [merkleProofArray, tokenURI],
				account: userAddress,
				chainId,
			});

			addToast({
				title: "Transaction sent",
				desc: `Your NFT is being minted. Hash: ${hash.slice(
					0,
					8
				)}...${hash.slice(-6)}`,
				type: "success",
			});

			return hash;
		},
		[userAddress, contractAddress, writeContractAsync, chainId]
	);

	useEffect(() => {
		if (txRest.isError) {
			addToast({
				title: "Claim failed",
				desc: txRest.error
					? String(txRest.error.message || txRest.error)
					: "Transaction failed.",
				type: "error",
			});
		}
	}, [txRest.isSuccess, txRest.isError]);

	useEffect(() => {
		if (receipt.isError) {
			addToast({
				title: "Problem with confirmation",
				desc: "Could not confirm the transaction status. Check your wallet or the block explorer.",
				type: "error",
			});
		}
		if (receipt.isSuccess) {
			addToast({
				title: "NFT claimed successfully!",
				desc: "Your NFT has been confirmed on the blockchain. It should appear in your wallet shortly.",
				type: "success",
			});
		}
	}, [receipt.isLoading, receipt.isError, receipt.isSuccess]);

	const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

	return {
		balance,
		claimNft,
		receipt,
		tx: { hash: txHash, ...txRest },
		balanceMoreThanZero,
	};
}
