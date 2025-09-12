import { Keccak } from "sha3";
import {
	BatchInclusionData,
	NFTClaimMerkleProof,
	NoncedVerificationdata,
	ProofSubmission,
	provingSystemNameToByte,
	VerificationData,
} from "../types/aligned";
import { Address } from "viem";

export type FetchProofVerificationDataResponse = {
	id: string;
	verification_data: NoncedVerificationdata;
	batch_data: BatchInclusionData | null;
	game_idx: number;
};

export const fetchProofSubmission = async (
	proof_id: string
): Promise<ProofSubmission | null> => {
	try {
		const response = await fetch(`/proof/${proof_id}`, {
			method: "GET",
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data;
	} catch (error) {
		return null;
	}
};

export const fetchProofVerificationData = async (
	proof_id: string
): Promise<FetchProofVerificationDataResponse | null> => {
	try {
		const response = await fetch(
			`/proof/verification-data?proof_id=${encodeURIComponent(proof_id)}`,
			{
				method: "GET",
				credentials: "include",
				headers: {
					Accept: "application/json",
				},
			}
		);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data[0];
	} catch (error) {
		return null;
	}
};

export const computeVerificationDataCommitment = (
	verificationData: VerificationData
) => {
	const hasher = new Keccak(256);
	hasher.update(Buffer.from(verificationData.proof));
	const proofCommitment = hasher.digest();
	hasher.reset();

	let pubInputCommitment = Buffer.from(new Uint8Array(32).fill(0));
	const publicInput = verificationData.publicInput;
	if (publicInput) {
		pubInputCommitment = hasher.update(Buffer.from(publicInput)).digest();
	}
	hasher.reset();

	let provingSystemAuxDataCommitment: Buffer = Buffer.from(
		new Uint8Array(32).fill(0)
	);
	const provingSystemByte = Buffer.from([
		provingSystemNameToByte[verificationData.provingSystem],
	]);
	if (verificationData.verificationKey) {
		hasher.update(Buffer.from(verificationData.verificationKey));
		hasher.update(provingSystemByte);
		provingSystemAuxDataCommitment = hasher.digest();
	} else if (verificationData.vmProgramCode) {
		hasher.update(Buffer.from(verificationData.vmProgramCode));
		hasher.update(provingSystemByte);
		provingSystemAuxDataCommitment = hasher.digest();
	}

	const proofGeneratorAddress = Buffer.from(
		hexStringToBytes(verificationData.proofGeneratorAddress)
	);

	hasher.reset();
	hasher.update(proofCommitment);
	hasher.update(pubInputCommitment);
	hasher.update(provingSystemAuxDataCommitment);
	hasher.update(proofGeneratorAddress);
	const commitmentDigest = hasher.digest();
	hasher.reset();

	return {
		commitmentDigest,
		proofCommitment,
		pubInputCommitment,
		provingSystemAuxDataCommitment,
	};
};

function hexStringToBytes(hex: string): Uint8Array {
	if (hex.startsWith("0x")) hex = hex.slice(2);
	if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

export const fetchMerkleProofForAddress = async (
	address: Address
): Promise<{
	merkle_proof: NFTClaimMerkleProof;
	tokenURI: string;
	merkleRootIndex: number;
} | null> => {
	try {
		const response = await fetch(`/api/nft/proof?address=${address}`, {
			method: "GET",
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data;
	} catch (error) {
		return null;
	}
};

export const fetchNftClaimEligibility = async (
	address: Address
): Promise<{ eligible: boolean } | null> => {
	try {
		const response = await fetch(
			`/api/nft/eligibility?address=${address}`,
			{
				method: "GET",
				credentials: "include",
				headers: {
					Accept: "application/json",
				},
			}
		);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data;
	} catch (error) {
		return null;
	}
};
