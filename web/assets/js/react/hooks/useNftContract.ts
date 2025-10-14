import React, { useCallback, useEffect } from "react";
import { Address } from "viem";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
	usePublicClient,
} from "wagmi";
import { useToast } from "../state/toast";
import { zkArcadeNftAbi } from "../constants/aligned";
import { fetchMerkleProofForAddress } from "../utils/aligned";

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
	const publicClient = usePublicClient();

	const balance = useReadContract({
		address: contractAddress,
		abi: zkArcadeNftAbi,
		functionName: "balanceOf",
		args: userAddress ? [userAddress] : undefined,
		chainId,
	});

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const claimNft = useCallback(async () => {
		if (!userAddress) {
			addToast({
				title: "Wallet not connected",
				desc: "Please connect your wallet to continue.",
				type: "error",
			});
			throw new Error("Wallet not connected");
		}

		const res = await fetchMerkleProofForAddress(userAddress);
		if (!res) {
			addToast({
				title: "Eligibility check failed",
				desc: "We couldn’t fetch your eligibility proof. Please try again.",
				type: "error",
			});
			return;
		}

		let merkleProofArray: `0x${string}`[];
		try {
			merkleProofArray = processRawMerkleProof(res.merkle_proof);
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
			args: [merkleProofArray, BigInt(res.merkle_root_index)],
			account: userAddress,
			chainId,
		});

		addToast({
			title: "Transaction sent",
			desc: `Your NFT is being minted on-chain. Tx Hash: ${hash.slice(
				0,
				8
			)}...${hash.slice(-6)}`,
			type: "success",
		});

		return hash;
	}, [userAddress, contractAddress, writeContractAsync, chainId, addToast]);

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
	}, [receipt.isSuccess, receipt.isError]);

	const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

	const [tokenURIs, setTokenURIs] = React.useState<string[]>([]);

	// Fetch events Transfer(from, to, tokenId) where to == userAddress
	// When the user has a balance > 0, we check the blockchain logs to see the NFTs they have received
	// Note: We are supposing the user has received exactly 'balance.data' NFTs
	useEffect(() => {
		if (!userAddress || !balanceMoreThanZero) return;

		const fetchEvents = async () => {
			try {
				if (!publicClient) {
					console.error("Wagmi publicClient not initialized");
					return;
				}

				const events = await publicClient.getLogs({
					address: contractAddress,
					event: {
						anonymous: false,
						inputs: [
							{ indexed: true, internalType: "address", name: "from", type: "address" },
							{ indexed: true, internalType: "address", name: "to", type: "address" },
							{ indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }
						],
						name: "Transfer",
						type: "event"
					},
					args: {
						to: userAddress,
					},
					fromBlock: 0n,
					toBlock: "latest",
				});

				const fetchTokenURIs = async () => {
					try {
						if (!publicClient) {
							console.error("Wagmi publicClient not initialized");
							return;
						}

						const uris: string[] = [];
						for (let i = 0; i < (balance.data || 0n); i++) {
							// const tokenId = events[i]?.args?.tokenId;

							// HARDCODED: if tokenId is 0, increase it to 1
							const tokenId = events[i]?.args?.tokenId === 0n ? 1n : events[i]?.args?.tokenId;

							if (tokenId === undefined) {
								console.warn(`No tokenId found for event index ${i}`);
								continue;
							}

							let tokenURI = await publicClient.readContract({
								address: contractAddress,
								abi: zkArcadeNftAbi,
								functionName: "tokenURI",
								args: [tokenId],
							});

							// HARDCODED: replace bafkreifhkee23fhenp2x3uk6kwbzlpccofwqd74hyc7xftn4dblkr6wnay for bafybeie4an7i3rey27sbcewdjya74eyag27es5aozekphe2dvzbpmsvwym
							tokenURI = tokenURI.replace("bafkreifhkee23fhenp2x3uk6kwbzlpccofwqd74hyc7xftn4dblkr6wnay", "bafybeie4an7i3rey27sbcewdjya74eyag27es5aozekphe2dvzbpmsvwym");

							// Replace the initial ipfs:// in url for the ipfs gateway we use
							tokenURI = tokenURI.replace("ipfs://", "https://gateway.lighthouse.storage/ipfs/");

							console.log(`Fetched tokenURI for tokenId ${tokenId}: ${tokenURI}`);

							uris.push(tokenURI);
						}
						setTokenURIs(uris);
					} catch (e) {
						console.error("Error fetching token URIs:", e);
					}
				};
				fetchTokenURIs();
			} catch (e) {
				console.error("Error fetching Transfer events:", e);
			}
		};

		fetchEvents();
	}, [userAddress, balanceMoreThanZero, publicClient, balance.data, contractAddress]);

	return {
		balance,
		claimNft,
		receipt,
		tx: { hash: txHash, ...txRest },
		balanceMoreThanZero,
		tokenURIs,
	};
}
