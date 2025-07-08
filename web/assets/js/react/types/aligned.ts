import { Signature } from "viem";

export type SubmitProof = {
    verificationData: NoncedVerificationdata;
    signature: Signature;
};

export type NoncedVerificationdata = {
    verificationData: VerificationData;
    nonce: `0x${string}`;
    maxFee: `0x${string}`;
};

export type VerificationData = {
    provingSystem:
        | "GnarkPlonkBls12_381"
        | "GnarkPlonkBn254"
        | "GnarkGroth16Bn254"
        | "SP1"
        | "Risc0"
        | "CircomGroth16Bn256";
    proof: Uint8Array;
    publicInput?: Uint8Array;
    verificationKey?: Uint8Array;
    vmProgramCode?: Uint8Array;
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

export type VerificationDataCommitment = {
    proofCommitment: Uint8Array;
    publicInputCommitment: Uint8Array;
    provingSystemAuxDataCommitment: Uint8Array;
    proofGeneratorAddr: Uint8Array;
};

export type InclusionProof = {
    merkle_path: Array<Uint8Array>;
};

export type BatchInclusionData = {
    batchMerkleRoot: Uint8Array;
    batchInclusionProof: InclusionProof;
    indexInBatch: number;
};

export type AlignedVerificationData = {
    verificationDataCommitment: VerificationDataCommitment;
    batchMerkleRoot: Uint8Array;
    batchInclusionProof: InclusionProof;
    indexInBatch: number;
};
