import React, { useCallback, useEffect, useState } from "react";
import { Address } from "viem";
import { useChainId, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useToast } from "../state/toast";
import { zkArcadeNftAbi } from "../constants/aligned";

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

export async function getUserTokenIds(publicClient: any, userAddress: Address, contractAddress: Address): Promise<bigint[]> {
    if (!publicClient) return [];

    const [received, sent] = await Promise.all([
        publicClient.getLogs({
            address: contractAddress,
            event: {
                anonymous: false,
                inputs: [
                    { indexed: true, internalType: "address", name: "from", type: "address" },
                    { indexed: true, internalType: "address", name: "to", type: "address" },
                    { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
                ],
                name: "Transfer",
                type: "event",
            },
            args: { to: userAddress },
            fromBlock: 0n,
            toBlock: "latest",
        }),
        publicClient.getLogs({
            address: contractAddress,
            event: {
                anonymous: false,
                inputs: [
                    { indexed: true, internalType: "address", name: "from", type: "address" },
                    { indexed: true, internalType: "address", name: "to", type: "address" },
                    { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
                ],
                name: "Transfer",
                type: "event",
            },
            args: { from: userAddress },
            fromBlock: 0n,
            toBlock: "latest",
        }),
    ]);

    const events = [...received, ...sent] as any;

    events.sort((a: any, b: any) => {
        const ab = (a.blockNumber ?? 0n);
        const bb = (b.blockNumber ?? 0n);
        if (ab !== bb) return ab < bb ? -1 : 1;

        const ai = Number((a as any).logIndex ?? 0);
        const bi = Number((b as any).logIndex ?? 0);
        return ai - bi;
    });

    // Note: A way to do this without filtering is requesting to the owner of the token to the contract
    const owned = new Set<bigint>();
    for (const ev of events) {
        const { from, to, tokenId } = ev.args;
        if (to?.toLowerCase() === userAddress.toLowerCase()) {
            owned.add(tokenId);
        } else if (from?.toLowerCase() === userAddress.toLowerCase()) {
            owned.delete(tokenId);
        }
    }

    return Array.from(owned);
}

// TODO: Remove this function after setting the 0 index file at IPFS folder
function normalizeTokenId(tokenId: bigint | undefined): bigint | undefined {
    if (tokenId === undefined) return undefined;
    // HARDCODED: if tokenId is 0, increase it to 1
    return tokenId === 0n ? 1n : tokenId;
}

// Gets the specific token URI requesting it to the NFT contract
async function getTokenURI(
    publicClient: any,
    contractAddress: Address,
    tokenId: bigint
): Promise<string> {
    const tokenURI = await publicClient.readContract({
        address: contractAddress,
        abi: zkArcadeNftAbi,
        functionName: "tokenURI",
        args: [tokenId],
    });

    return tokenURI.replace("ipfs://", "https://gateway.lighthouse.storage/ipfs/");
}

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
        const imageUrl = processImageUrl(data.image);

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

// Helper function to process IPFS URLs and convert them to gateway URLs
export function processImageUrl(imageUrl: string): string {
	if (imageUrl.startsWith('ipfs://')) {
		const ipfsHash = imageUrl.split("ipfs://")[1];
		return `https://ipfs.io/ipfs/${ipfsHash}`;
	}
	return imageUrl;
}

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
	// Note: We are supposing the user has received exactly 'balance.data' NFTs
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
