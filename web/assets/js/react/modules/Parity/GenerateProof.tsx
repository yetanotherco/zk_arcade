import { formatEther, toHex } from "viem";
import { VerificationData } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import * as snarkjs from "snarkjs";

const toBytesFromJSON = (obj: unknown) =>
  new TextEncoder().encode(JSON.stringify(obj));

const fetchTextAsBytes = async (url: string) =>
  new TextEncoder().encode(await (await fetch(url)).text());

type GenerateSubmitProofParams = {
    user_address: Address;
    userPositions: [number, number][];
    levelBoards: number[][];
};

const MaxRounds = 50;

export async function generateCircomParityProof({
    user_address,
    userPositions,
    levelBoards,
}: GenerateSubmitProofParams): Promise<VerificationData> {
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
        userPositions: userPositions,
        userAddress: user_address
    };

    const wasmPath = "/artifacts/parity.wasm";
    const zkeyPath = "/artifacts/parity_final.zkey";
    const vkeyPath = "/artifacts/verification_key.json";

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);

    const proofBytes = toBytesFromJSON(proof);
    const publicInputsBytes = toBytesFromJSON(publicSignals);
    const vKeyBytes = await fetchTextAsBytes(vkeyPath);

    // Create verification data
    const verificationData: VerificationData = {
        provingSystem: "CircomGroth16Bn256",
        proof: Array.from(proofBytes),
        publicInput: Array.from(publicInputsBytes),
        vmProgramCode: undefined,
        verificationKey: Array.from(vKeyBytes),
        proofGeneratorAddress: user_address,
    };

    return verificationData;
}
