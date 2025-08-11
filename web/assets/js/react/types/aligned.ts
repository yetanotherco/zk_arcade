import { Address, Hex } from "viem";

export type ProofSubmission = {
	id: string;
	game: string;
	proving_system: ProvingSystem;
	status: "submitted" | "pending" | "failed" | "claimed";
	inserted_at: string;
	batch_hash: string | null;
	verification_data_commitment: `0x${string}`;
};

export type SubmitProof = {
	verificationData: NoncedVerificationdata;
	signature: {
		r: Hex;
		s: Hex;
		v: number;
	};
};

export type NoncedVerificationdata = {
	verificationData: VerificationData;
	nonce: `0x${string}`;
	maxFee: `0x${string}`;
	chain_id: `0x${string}`;
	payment_service_addr: Address;
};

export type ProvingSystem =
	| "GnarkPlonkBls12_381"
	| "GnarkPlonkBn254"
	| "GnarkGroth16Bn254"
	| "SP1"
	| "Risc0"
	| "CircomGroth16Bn256";

export type VerificationData = {
	provingSystem: ProvingSystem;
	proof: number[];
	publicInput?: number[];
	verificationKey?: number[];
	vmProgramCode?: number[];
	proofGeneratorAddress: string;
};

export const provingSystemNameToByte: Record<
	VerificationData["provingSystem"],
	number
> = {
	GnarkPlonkBls12_381: 0,
	GnarkPlonkBn254: 1,
	GnarkGroth16Bn254: 2,
	SP1: 3,
	Risc0: 4,
	CircomGroth16Bn256: 5,
};

export const provingSystemByteToName: Record<
	number,
	VerificationData["provingSystem"]
> = {
	0: "GnarkPlonkBls12_381",
	1: "GnarkPlonkBn254",
	2: "GnarkGroth16Bn254",
	3: "SP1",
	4: "Risc0",
	5: "CircomGroth16Bn256",
};

export type VerificationDataCommitment = {
	proofCommitment: Uint8Array;
	publicInputCommitment: Uint8Array;
	provingSystemAuxDataCommitment: Uint8Array;
	proofGeneratorAddr: Uint8Array;
};

export type InclusionProof = {
	merkle_path: Uint8Array[];
};

export type BatchInclusionData = {
	batch_merkle_root: Uint8Array;
	batch_inclusion_proof: InclusionProof;
	index_in_batch: number;
};

export type AlignedVerificationData = {
	verificationDataCommitment: VerificationDataCommitment;
	batchMerkleRoot: Uint8Array;
	batchInclusionProof: InclusionProof;
	indexInBatch: number;
};
