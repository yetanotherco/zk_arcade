import { Address } from "viem";
import { zkArcadeNftAbi } from "../../constants/aligned";
import { NftMetadata } from ".";

type Proof = `0x${string}`[] | `0x${string}` | string;

export async function getUserTokenIds(userAddress: Address): Promise<bigint[]> {
	if (!userAddress) return [];

	try {
		const response = await fetch(`/api/wallet/${userAddress}/nfts`);
		if (!response.ok) {
			return [];
		}

		const data = await response.json();
		const rawTokenIds: string[] = Array.isArray(data.token_ids)
			? data.token_ids
			: [];

		return rawTokenIds.map(t => BigInt(t));
	} catch (_error) {
		return [];
	}
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
