import React, { useEffect, useState } from "react";
import { Address } from "viem";
import { useChainId, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useToast } from "../../state/toast";
import { zkArcadeNftAbi } from "../../constants/aligned";
import { convertIpfsToHttpUrl, getUserTokenIds, normalizeTokenId, getTokenURI } from "./utils";

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

// Main hook to get the NFT token IDs and related data for a user
export function useNftTokenIds({ userAddress, contractAddress }: HookArgs) {
    const publicClient = usePublicClient();
	const { addToast } = useToast();
    const chainId = useChainId();

    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [claimedNftMetadata, setClaimedNftMetadata] = useState<NftMetadata | null>(null);

	const [processedTxHash, setProcessedTxHash] = useState<string | null>(null);

    const { writeContractAsync, data: txHash, ...txRest } = useWriteContract();
    const receipt = useWaitForTransactionReceipt({ hash: txHash });

    const balance = useReadContract({
        address: contractAddress,
        abi: zkArcadeNftAbi,
        functionName: "balanceOf",
        args: userAddress ? [userAddress] : undefined,
        chainId,
    });

	const balanceMoreThanZero = (balance.data && balance.data > 0n) || false;

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
                        const tokenId = normalizeTokenId(latestTokenId);

                        if (tokenId !== undefined) {
                            const tokenURI = await getTokenURI(publicClient, contractAddress, tokenId);
                            
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

	const [tokenURIs, setTokenURIs] = React.useState<string[]>([]);

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
							const tokenId = normalizeTokenId(userTokenIds[i]);

							if (tokenId === undefined) {
								continue;
							}

							const tokenURI = await getTokenURI(publicClient, contractAddress, tokenId);

							uris.push(tokenURI);
						}
						setTokenURIs(uris);
					} catch (e) {
					}
				};
				fetchTokenURIs();
			} catch (e) {
			}
		};

		fetchEvents();
	}, [userAddress, balanceMoreThanZero, publicClient, balance.data, contractAddress]);

    return {
        balance,
		tokenURIs,
        showSuccessModal,
        setShowSuccessModal,
        claimedNftMetadata,
        setClaimedNftMetadata,
    };
}
