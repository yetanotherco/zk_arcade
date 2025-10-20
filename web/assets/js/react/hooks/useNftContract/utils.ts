import React from "react";
import { Address } from "viem";
import { zkArcadeNftAbi } from "../../constants/aligned";

// Gets all the token IDs owned by the user by processing Transfer events. The token IDs returned are the
// difference between received and sent tokens.
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

// Gets the specific token URI requesting it to the NFT contract
export async function getTokenURI(
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

// Receives an ipfs URL and processes it to return a HTTP URL
export function convertIpfsToHttpUrl(imageUrl: string): string {
    if (imageUrl.startsWith('ipfs://')) {
        const ipfsHash = imageUrl.split("ipfs://")[1];
        return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    return imageUrl;
}
