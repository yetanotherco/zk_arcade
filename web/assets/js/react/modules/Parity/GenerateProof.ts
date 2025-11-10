import { pad, toBytes, toHex } from "viem";
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
	gameConfig: string;
};

const MaxLevels = 3;

const getCsrfToken = () => {
	if (typeof document === "undefined") return "";
	return (
		document.head
			?.querySelector("[name~=csrf-token]")
			?.getAttribute("content") || ""
	);
};

const reportParityGameConfigMismatchToTelemetry = async (data: {
	gameConfig: string;
	gameTrace: {
		levelsBoards: number[][][];
		userPositions: number[][][];
	};
	programInputs: Record<string, any>;
	publicInputs: string;
}): Promise<void> => {
	try {
		await fetch("/api/telemetry/error", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				_csrf_token: getCsrfToken(),
				name: "Parity game config mismatch",
				message: "Parity proof public inputs mismatch",
				details: data,
			}),
		});
	} catch {}
};

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
	gameConfig,
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

	const gameConfigBytes = toBytes(gameConfig);
	const gameConfigs = [];
	// check game configs match
	for (let i = 32; i < 32 * usedLevels; i++) {
		if (publicInputsBytes[i] !== Number(gameConfigBytes[i])) {
			reportParityGameConfigMismatchToTelemetry({
				gameConfig,
				gameTrace: {
					levelsBoards,
					userPositions,
				},
				programInputs: input,
				publicInputs: toHex(Uint8Array.from(publicInputsBytes)),
			});
			throw new Error(
				`Parity proof validation failed game config mismatch`
			);
		}
	}

	// collect each game config and verify they are different
	for (let i = 0; i < usedLevels; i++) {
		const game = publicInputsBytes.slice(32 * i, 64 * i);
		gameConfigs.push(game);
	}

	const hasRepeatedGameConfig = (() => {
		const seenConfigs = new Set<string>();
		for (const config of gameConfigs) {
			const key = config.join(",");
			if (seenConfigs.has(key)) return true;
			seenConfigs.add(key);
		}
		return false;
	})();

	if (hasRepeatedGameConfig) {
		reportParityGameConfigMismatchToTelemetry({
			gameConfig,
			gameTrace: {
				levelsBoards,
				userPositions,
			},
			programInputs: input,
			publicInputs: toHex(Uint8Array.from(publicInputsBytes)),
		});
		throw new Error(`Parity proof validation failed game config mismatch`);
	}

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
