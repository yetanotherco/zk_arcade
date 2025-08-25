import { formatEther, toHex } from "viem";
import {
    NoncedVerificationdata,
    SubmitProof,
    VerificationData,
} from "../../types/aligned";
import { Address } from "../../types/blockchain";
import * as snarkjs from "snarkjs";

const toBytesFromJSON = (obj: unknown) =>
  new TextEncoder().encode(JSON.stringify(obj));

const fetchTextAsBytes = async (url: string) =>
  new TextEncoder().encode(await (await fetch(url)).text());

type GenerateSubmitProofParams = {
    payment_service_address: Address;
    user_address: Address;
    userPositions: [number, number][];
    levelBoards: number[][];
    nonce: bigint;
    chainId: number;
    estimateMaxFeeForBatchOfProofs: (batchSize: number) => Promise<bigint | null>;
    signVerificationData: (data: NoncedVerificationdata, paymentServiceAddress: Address) => Promise<{ r: string; s: string; v: bigint }>;
};

const MaxRounds = 50;

export async function generateCircomParityProof({
    payment_service_address,
    user_address,
    userPositions,
    levelBoards,
    nonce,
    chainId,
    estimateMaxFeeForBatchOfProofs,
    signVerificationData,
}: GenerateSubmitProofParams): Promise<string> {
    // Generate proof and public signals
    const roundsToFill = MaxRounds - userPositions.length;
    const lastPosition = userPositions[userPositions.length - 1] || [0, 0];
    const lastLevelBoard = levelBoards[levelBoards.length - 1] || [0, 0, 0, 0, 0, 0, 0, 0, 0];

    for (let i = 0; i < roundsToFill; i++) {
        userPositions.push(lastPosition);
        levelBoards.push(lastLevelBoard);
    }

    const input = {
        levelBoards: levelBoards,
        userPositions: userPositions
    };

    const wasmPath = "/artifacts/parity.wasm";
    const zkeyPath = "/artifacts/parity_final.zkey";
    const vkeyPath = "/artifacts/verification_key.json";

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

    const proofBytes = toBytesFromJSON(proof);
    const publicInputsBytes = toBytesFromJSON(publicSignals);
    const vKeyBytes = await fetchTextAsBytes(vkeyPath);

    const maxFee = await estimateMaxFeeForBatchOfProofs(16);
    if (!maxFee) {
        throw new Error("Could not estimate max fee");
    }

    // Create verification data
    const verificationData: VerificationData = {
        provingSystem: "CircomGroth16Bn256",
        proof: Array.from(proofBytes),
        publicInput: Array.from(publicInputsBytes),
        vmProgramCode: undefined,
        verificationKey: Array.from(vKeyBytes),
        proofGeneratorAddress: user_address,
    };

    const noncedVerificationdata: NoncedVerificationdata = {
        maxFee: toHex(maxFee, { size: 32 }),
        nonce: toHex(nonce, { size: 32 }),
        chain_id: toHex(chainId, { size: 32 }),
        payment_service_addr: payment_service_address,
        verificationData,
    };

    console.log("Nonced Verification Data:", noncedVerificationdata);
    console.log("Paym")

    // Sign the verification data
    const { r, s, v } = await signVerificationData(noncedVerificationdata, payment_service_address);

    // Create submit proof message
    const submitProofMessage: SubmitProof = {
        verificationData: noncedVerificationdata,
        signature: {
            r: r as `0x${string}`,
            s: s as `0x${string}`,
            v: Number(v),
        },
    };

    return JSON.stringify(submitProofMessage);
}
