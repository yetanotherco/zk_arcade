import React, { useCallback, useEffect, useState } from "react";
import { Address } from "viem";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
	usePublicClient,
} from "wagmi";
import { useToast } from "../../state/toast";
import { zkArcadeNftAbi } from "../../constants/aligned";
import { fetchMerkleProofForAddress } from "../../utils/aligned";
import { getUserTokenIds, getTokenURI, convertIpfsToHttpUrl } from "./utils";

type HookArgs = {
	userAddress: Address;
	contractAddress: Address;
};

type Proof = `0x${string}`[] | `0x${string}` | string;

export type NftMetadata = {
	name: string;
	description: string;
	image: string;
	tokenId?: bigint;
	address?: Address;
};

// Fetches the NFT metadata from a given JSON URL and the NFT contract address
export async function getNftMetadata(jsonUrl: string, nftContractAddress: Address): Promise<NftMetadata> {
	try {
		const response = await fetch(jsonUrl);
		if (!response.ok) {
			throw new Error(`Error fetching metadata: ${response.status}`);
		}

		const data = await response.json();

		if (!data.name || !data.description || !data.image) {
			throw new Error('Invalid metadata format');
		}

		// Convert IPFS URL to gateway URL if needed
		const imageUrl = convertIpfsToHttpUrl(data.image);

		// Get the tokenID from url last digits (separated by /)
		const tokenId = BigInt(jsonUrl.split("/").pop() || 0);

		return {
			name: data.name,
			description: data.description,
			image: imageUrl,
			tokenId: tokenId,
			address: nftContractAddress,
		};
	} catch (error) {
		throw error;
	}
}

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
	
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [claimedNftMetadata, setClaimedNftMetadata] = useState<NftMetadata | null>(null);
	const [processedTxHash, setProcessedTxHash] = useState<string | null>(null);
	const [tokenURIs, setTokenURIs] = useState<string[]>([]);

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
	}, [txRest.isSuccess, txRest.isError, addToast]);

	useEffect(() => {
		if (receipt.isError) {
			addToast({
				title: "Problem with confirmation",
				desc: "Could not confirm the transaction status. Check your wallet or the block explorer.",
				type: "error",
			});
		}
		
		// Only process success if we haven't already processed this transaction
		if (receipt.isSuccess && txHash && processedTxHash !== txHash) {
			setProcessedTxHash(txHash);
			
			// Fetch the latest NFT metadata and show modal
			const fetchLatestNftMetadata = async () => {
				try {
					if (!publicClient) return;

					const userTokenIds = await getUserTokenIds(publicClient, userAddress, contractAddress);

					if (userTokenIds.length > 0) {
						// Get the latest event (most recent NFT)
						const latestTokenId = userTokenIds[userTokenIds.length - 1];

						if (latestTokenId !== undefined) {
							const tokenURI = await getTokenURI(publicClient, contractAddress, latestTokenId);
							
							// Fetch the metadata
							const metadata = await getNftMetadata(tokenURI, contractAddress);
							setClaimedNftMetadata(metadata);
							setShowSuccessModal(true);
						}
					}
				} catch (error) {
					console.error("Error fetching latest NFT metadata:", error);
				}
			};

			fetchLatestNftMetadata();
		}
	}, [receipt.isSuccess, receipt.isError, txHash, processedTxHash, publicClient, contractAddress, userAddress, addToast]);

	// Reset processed hash when starting a new transaction
	useEffect(() => {
		if (txHash && processedTxHash && processedTxHash !== txHash) {
			setProcessedTxHash(null);
		}
	}, [txHash, processedTxHash]);

	const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

	// Fetch events Transfer(from, to, tokenId) where to == userAddress
	// When the user has a balance > 0, we check the blockchain logs to see the NFTs they have received
	useEffect(() => {
		if (!userAddress || !balanceMoreThanZero) return;

		const fetchEvents = async () => {
			try {
				if (!publicClient) {
					console.error("Wagmi publicClient not initialized");
					return;
				}

				const userTokenIds = await getUserTokenIds(publicClient, userAddress, contractAddress);

				const fetchTokenURIs = async () => {
					try {
						if (!publicClient) {
							return;
						}

						const uris: string[] = [];
						for (let i = 0; i < (balance.data || 0n); i++) {
							const tokenId = userTokenIds[i];

							if (tokenId === undefined) {
								continue;
							}

							const tokenURI = await getTokenURI(publicClient, contractAddress, tokenId);

							uris.push(tokenURI);
						}
						setTokenURIs(uris);
					} catch (e) {
						console.error("Error fetching token URIs:", e);
					}
				};
				fetchTokenURIs();
			} catch (e) {
				console.error("Error fetching events:", e);
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
		showSuccessModal,
		setShowSuccessModal,
		claimedNftMetadata,
		setClaimedNftMetadata,
	};
}
