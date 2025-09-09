import { getAddress, pad, toBytes, toHex } from "viem";
import { VerificationData } from "../../types/aligned";
import { Address } from "../../types/blockchain";
import * as snarkjs from "snarkjs";
import { PARITY_MAX_MOVEMENTS } from "../../constants/parity";

const toBytesFromJSON = (obj: unknown) =>
	new TextEncoder().encode(JSON.stringify(obj));

const fetchTextAsBytes = async (url: string) =>
	new TextEncoder().encode(await (await fetch(url)).text());

type GenerateSubmitProofParams = {
	user_address: Address;
	userPositions: [number, number][][];
	levelsBoards: number[][][];
};

const MaxLevels = 3;

// We clone the positions to avoid overlapping between the round elements of each level
function clonePos(p: [number, number]): [number, number] {
	return [p[0], p[1]];
}

// Fill the elements of the remaining rounds for each passed level with the last state recorded
function fillLevelElements(
	positions: [number, number][],
	boards: number[][]
): { positions: [number, number][]; boards: number[][] } {
	const pos = positions.map(clonePos);
	const brd = boards.map(row => row.slice());

	const lastPos: [number, number] = pos[pos.length - 1] ?? [0, 0];
	const lastBrd: number[] = brd[brd.length - 1] ?? Array(9).fill(0);

	while (pos.length < PARITY_MAX_MOVEMENTS) pos.push(clonePos(lastPos));
	while (brd.length < PARITY_MAX_MOVEMENTS) brd.push([...lastBrd]);

	return { positions: pos, boards: brd };
}

function makeEmptyLevel(): {
	positions: [number, number][];
	boards: number[][];
} {
	const zeroPos: [number, number] = [0, 0];
	const zeroBoard = Array(9).fill(0);
	return {
		positions: Array.from({ length: PARITY_MAX_MOVEMENTS }, () =>
			clonePos(zeroPos)
		),
		boards: Array.from({ length: PARITY_MAX_MOVEMENTS }, () => [
			...zeroBoard,
		]),
	};
}

export async function generateCircomParityProof({
	user_address,
	userPositions,
	levelsBoards,
}: GenerateSubmitProofParams): Promise<VerificationData> {
	const allUserPositions: [number, number][][] = [];
	const allLevelsBoards: number[][][] = [];

	const usedLevels = Math.min(levelsBoards.length, MaxLevels);

	for (let i = 0; i < usedLevels; i++) {
		const levelUserPositions = userPositions[i] ?? [];
		const levelBoards = levelsBoards[i] ?? [];

		const { positions, boards } = fillLevelElements(
			levelUserPositions,
			levelBoards
		);
		allUserPositions.push(positions);
		allLevelsBoards.push(boards);
	}

	while (allLevelsBoards.length < MaxLevels) {
		const empty = makeEmptyLevel();
		allUserPositions.push(empty.positions);
		allLevelsBoards.push(empty.boards);
	}

	const input = {
		levelsBoards: allLevelsBoards,
		userPositions: allUserPositions,
		userAddress: user_address,
	};

	const wasmPath = "/artifacts/parity.wasm";
	const zkeyPath = "/artifacts/parity_final.zkey";
	const vkeyPath = "/artifacts/verification_key.json";

	const { proof, publicSignals } = await snarkjs.groth16.fullProve(
		input,
		wasmPath,
		zkeyPath
	);

	const proofBytes = toBytesFromJSON(proof);
	const publicInputsBytes: number[] = [];
	publicSignals.forEach(pub => {
		let number = pad(toHex(BigInt(pub)), {
			dir: "left",
			size: 32,
		});
		let bytes = toBytes(number);
		bytes.forEach(byte => publicInputsBytes.push(byte));
	});

	const vKeyBytes = await fetchTextAsBytes(vkeyPath);

	// Create verification data
	const verificationData: VerificationData = {
		provingSystem: "CircomGroth16Bn256",
		proof: Array.from(proofBytes),
		publicInput: publicInputsBytes,
		vmProgramCode: undefined,
		verificationKey: Array.from(vKeyBytes),
		proofGeneratorAddress: user_address,
	};

	return verificationData;
}
