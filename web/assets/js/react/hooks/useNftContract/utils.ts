import React from "react";
import { Address } from "viem";
import { zkArcadeNftAbi } from "../../constants/aligned";
import { NftMetadata } from ".";

type Proof = `0x${string}`[] | `0x${string}` | string;

// Gets all the token IDs owned by the user by processing Transfer events. The token IDs returned are the
// difference between received and sent tokens.
export async function getUserTokenIds(
	publicClient: any,
	userAddress: Address,
	contractAddress: Address
): Promise<bigint[]> {
	if (!publicClient) return [];

	const [received, sent] = await Promise.all([
		publicClient.getLogs({
			address: contractAddress,
			event: {
				anonymous: false,
				inputs: [
					{
						indexed: true,
						internalType: "address",
						name: "from",
						type: "address",
					},
					{
						indexed: true,
						internalType: "address",
						name: "to",
						type: "address",
					},
					{
						indexed: true,
						internalType: "uint256",
						name: "tokenId",
						type: "uint256",
					},
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
					{
						indexed: true,
						internalType: "address",
						name: "from",
						type: "address",
					},
					{
						indexed: true,
						internalType: "address",
						name: "to",
						type: "address",
					},
					{
						indexed: true,
						internalType: "uint256",
						name: "tokenId",
						type: "uint256",
					},
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
		const ab = a.blockNumber ?? 0n;
		const bb = b.blockNumber ?? 0n;
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

	return tokenURI.replace(
		"ipfs://",
		"https://gateway.lighthouse.storage/ipfs/"
	);
}

// Receives an ipfs URL and processes it to return a HTTP URL
export function convertIpfsToHttpUrl(imageUrl: string): string {
	if (imageUrl.startsWith("ipfs://")) {
		const ipfsHash = imageUrl.split("ipfs://")[1];
		return `https://ipfs.io/ipfs/${ipfsHash}`;
	}
	return imageUrl;
}

// Fetches the NFT metadata from a given JSON URL and the NFT contract address
export async function getNftMetadata(
	jsonUrl: string,
	nftContractAddress: Address
): Promise<NftMetadata> {
	try {
		const response = await fetch(jsonUrl);
		if (!response.ok) {
			throw new Error(`Error fetching metadata: ${response.status}`);
		}

		const data = await response.json();

		if (!data.name || !data.description || !data.image) {
			throw new Error("Invalid metadata format");
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
export const processRawMerkleProof = (input: Proof): `0x${string}`[] => {
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
};
