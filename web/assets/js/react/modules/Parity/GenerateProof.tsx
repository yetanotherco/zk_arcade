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
    userPositions: [number, number][][];
    levelsBoards: number[][][];
};

const MaxRounds = 32;
const MaxLevels = 3;

export async function generateCircomParityProof({
    user_address,
    userPositions,
    levelsBoards,
}: GenerateSubmitProofParams): Promise<VerificationData> {
    console.log("Generating proof for user:", user_address);
    console.log("User positions:", userPositions);
    console.log("Levels boards:", levelsBoards);

    // There is a bug in how the levels are filled.

    // Fill the remaining rounds for each passed level with the last state
    for (let i = 0; i < levelsBoards.length; i++) {
        const roundsToFill = MaxRounds - userPositions[i].length;
        const lastPosition = userPositions[i][userPositions[i].length - 1] || [0, 0];
        const lastLevelBoard = levelsBoards[i][levelsBoards[i].length - 1] || [0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (let j = 0; j < roundsToFill; j++) {
            userPositions[i].push(lastPosition);
            levelsBoards[i].push(lastLevelBoard);
        }
    }

    // Fill not passed levels with zeros
    const levelsToFill = MaxLevels - levelsBoards.length;

    for (let i = 0; i < levelsToFill; i++) {
        const emptyLevelBoards = Array(MaxRounds).fill(Array(9).fill(0));
        levelsBoards.push(emptyLevelBoards);

        const emptyUserPositions = Array(MaxRounds).fill([0, 0]);
        userPositions.push(emptyUserPositions);
    }

    const input = {
        levelsBoards: levelsBoards,
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
