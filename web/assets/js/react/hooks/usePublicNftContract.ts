import React, { useCallback, useEffect, useRef, useState } from "react";
import { Address, parseEther } from "viem";
import {
	useChainId,
	useReadContract,
	useWaitForTransactionReceipt,
	useWriteContract,
	usePublicClient,
} from "wagmi";
import { useToast } from "../state/toast";
import { publicZkArcadeNftAbi } from "../constants/aligned";
import { fetchPublicMerkleProofForAddress } from "../utils/aligned";
import {
	getUserTokenIds,
	getTokenURIIpfs,
	processRawMerkleProof,
	getNftMetadata,
	getTokenURI,
} from "./useNftContract/utils";

type HookArgs = {
	userAddress: Address;
	contractAddress: Address;
};

export type NftMetadata = {
	name: string;
	description: string;
	image: string;
	tokenId?: bigint;
	address?: Address;
};

export function usePublicNftContract({
	userAddress,
	contractAddress,
}: HookArgs) {
	const chainId = useChainId();
	const { addToast } = useToast();
	const publicClient = usePublicClient();

	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [claimedNftMetadata, setClaimedNftMetadata] =
		useState<NftMetadata | null>(null);
	const [processedTxHash, setProcessedTxHash] = useState<string | null>(null);
	const [tokenURIs, setTokenURIs] = useState<string[]>([]);
	const mintedTokenIdRef = useRef<bigint | null>(null);

	const balance = useReadContract({
		address: contractAddress,
		abi: publicZkArcadeNftAbi,
		functionName: "balanceOf",
		args: userAddress ? [userAddress] : undefined,
		chainId,
	});

	const discountedPrice = useReadContract({
		address: contractAddress,
		abi: publicZkArcadeNftAbi,
		functionName: "discountedPrice",
		chainId,
	});

	const fullPrice = useReadContract({
		address: contractAddress,
		abi: publicZkArcadeNftAbi,
		functionName: "fullPrice",
		chainId,
	});

	const totalSupply = useReadContract({
		address: contractAddress,
		abi: publicZkArcadeNftAbi,
		functionName: "totalSupply",
		chainId,
	});

	const maxSupply = useReadContract({
		address: contractAddress,
		abi: publicZkArcadeNftAbi,
		functionName: "maxSupply",
		chainId,
	});

	const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
	const receipt = useWaitForTransactionReceipt({ hash: txHash });

	const claimNft = useCallback(
		async (discountEligibility: boolean) => {
			if (!userAddress) {
				addToast({
					title: "Wallet not connected",
					desc: "Please connect your wallet to continue.",
					type: "error",
				});
				throw new Error("Wallet not connected");
			}

			if (discountEligibility) {
				// If eligible for discount, fetch merkle proof and call to whitelistedMint
				const res = await fetchPublicMerkleProofForAddress(userAddress);
				if (!res) {
					addToast({
						title: "Eligibility check failed",
						desc: "We couldn’t fetch your eligibility proof. Please try again.",
						type: "error",
					});
					return;
				}

				let merkleProofArray: `0x${string}`[] = [];
				try {
					merkleProofArray = processRawMerkleProof(res.merkle_proof);
				} catch (e: any) {
					addToast({
						title: "Error in eligibility proof",
						desc: `Could not validate your eligibility to claim your NFT`,
						type: "error",
					});
					return;
				}

				// Here we simulate the call to capture the tokenId returned by claimNFT
				try {
					if (publicClient) {
						const simulation = await publicClient.simulateContract({
							address: contractAddress,
							abi: publicZkArcadeNftAbi,
							functionName: "whitelistedMint",
							args: [
								merkleProofArray,
								BigInt(res.merkle_root_index),
							],
							account: userAddress,
							value: discountedPrice.data,
						});

						mintedTokenIdRef.current =
							simulation.result as unknown as bigint;
					}
				} catch (err) {
					console.log(err);
					mintedTokenIdRef.current = null;
				}

				const hash = await writeContractAsync({
					address: contractAddress,
					abi: publicZkArcadeNftAbi,
					functionName: "whitelistedMint",
					args: [merkleProofArray, BigInt(res.merkle_root_index)],
					account: userAddress,
					chainId,
					value: discountedPrice.data,
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
			} else {
				// If not eligible for discount, call to mint

				// Here we simulate the call to capture the tokenId returned by claimNFT
				try {
					if (publicClient) {
						const simulation = await publicClient.simulateContract({
							address: contractAddress,
							abi: publicZkArcadeNftAbi,
							functionName: "mint",
							args: [],
							account: userAddress,
							value: fullPrice.data,
						});

						mintedTokenIdRef.current =
							simulation.result as unknown as bigint;
					}
				} catch (_) {
					mintedTokenIdRef.current = null;
				}

				const hash = await writeContractAsync({
					address: contractAddress,
					abi: publicZkArcadeNftAbi,
					functionName: "mint",
					args: [],
					account: userAddress,
					chainId,
					value: fullPrice.data,
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
			}
		},
		[userAddress, contractAddress, writeContractAsync, chainId, addToast]
	);

	const lastErrorMessage = useRef<string | null>(null);
	useEffect(() => {
		if (!txRest.isError) {
			lastErrorMessage.current = null;
			return;
		}

		const message = txRest.error
			? String(txRest.error.message || txRest.error)
			: "Transaction failed.";

		if (lastErrorMessage.current === message) {
			return;
		}

		lastErrorMessage.current = message;

		addToast({
			title: "Claim failed",
			desc: message,
			type: "error",
		});
	}, [txRest.isError, txRest.error]);

	useEffect(() => {
		if (receipt.isError) {
			addToast({
				title: "Problem with confirmation",
				desc: "Could not confirm the transaction status. Check your wallet or the block explorer.",
				type: "error",
			});
		}

		if (receipt.isSuccess && txHash && processedTxHash !== txHash) {
			setProcessedTxHash(txHash);

			const fetchLatestNftMetadata = async () => {
				try {
					const storageKey = `${userAddress}:hasShownSuccessModal`;
					let mintedTokenId = mintedTokenIdRef.current;
					if (mintedTokenId === null) return;

					const tokenURI = await getTokenURI(
						publicClient,
						contractAddress,
						mintedTokenId
					);

					const metadata = await getNftMetadata(
						tokenURI,
						contractAddress
					);
					setClaimedNftMetadata(metadata);
					setShowSuccessModal(true);
					try {
						localStorage.setItem(storageKey, "true");
					} catch (_) {}
				} catch (error) {
					console.error("Error fetching latest NFT metadata:", error);
				}
			};

			fetchLatestNftMetadata();
		}
	}, [
		receipt.isSuccess,
		receipt.isError,
		txHash,
		processedTxHash,
		publicClient,
		contractAddress,
		userAddress,
	]);

	const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

	// When the user has a balance > 0, load cached NFT token IDs from the backend
	useEffect(() => {
		if (!userAddress || !balanceMoreThanZero) return;

		const fetchEvents = async () => {
			try {
				if (!publicClient) {
					console.error("Wagmi publicClient not initialized");
					return;
				}

				const userTokenIds = await getUserTokenIds(userAddress);

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

							const tokenURI = await getTokenURI(
								publicClient,
								contractAddress,
								tokenId
							);

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
	}, [
		userAddress,
		balanceMoreThanZero,
		publicClient,
		balance.data,
		contractAddress,
	]);

	const supplyLeft = (maxSupply.data ?? 0n) - (totalSupply.data ?? 0n);

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
		discountedPrice,
		fullPrice,
		totalSupply,
		maxSupply,
		supplyLeft,
		claimIsLoading: txRest.isPending || receipt.isLoading,
	};
}
