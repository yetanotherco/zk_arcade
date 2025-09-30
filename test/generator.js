import { getAddress, pad, toBytes, toHex } from "viem";
import * as snarkjs from "snarkjs";
import { readFile } from "fs/promises";
import { TextEncoder } from "util";
import path from "path";

export const PARITY_MAX_MOVEMENTS = 55;

const toBytesFromJSON = (obj) =>
    new TextEncoder().encode(JSON.stringify(obj));

const fetchTextAsBytes = async (filePath) => {
  const absPath = path.resolve(filePath);
  const text = await readFile(absPath, "utf-8"); 
  return new TextEncoder().encode(text);
};

const MaxLevels = 3;

function clonePos(p) {
    return [p[0], p[1]];
}

function fillLevelElements(
    positions,
    boards
) {
    const pos = positions.map(clonePos);
    const brd = boards.map(row => row.slice());

    const lastPos = pos[pos.length - 1] ?? [0, 0];
    const lastBrd = brd[brd.length - 1] ?? Array(9).fill(0);

    while (pos.length < PARITY_MAX_MOVEMENTS) pos.push(clonePos(lastPos));
    while (brd.length < PARITY_MAX_MOVEMENTS) brd.push([...lastBrd]);

    return { positions: pos, boards: brd };
}

function makeEmptyLevel() {
    const zeroPos = [0, 0];
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

export async function generateCircomParityProof(user_address, userPositions, levelsBoards) {
    const allUserPositions = [];
    const allLevelsBoards = [];

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

    const wasmPath = "../web/priv/static/artifacts/parity.wasm";
    const zkeyPath = "../web/priv/static/artifacts/parity_final.zkey";
    const vkeyPath = "../web/priv/static/artifacts/verification_key.json";

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        wasmPath,
        zkeyPath
    );

    const proofBytes = toBytesFromJSON(proof);
    const publicInputsBytes = [];
    publicSignals.forEach(pub => {
        let number = pad(toHex(BigInt(pub)), {
            dir: "left",
            size: 32,
        });
        let bytes = toBytes(number);
        bytes.forEach(byte => publicInputsBytes.push(byte));
    });

    console.log("vkeyPath", vkeyPath);
    const vKeyBytes = await fetchTextAsBytes(vkeyPath);

    // Create verification data
    const verificationData = {
        provingSystem: "CircomGroth16Bn256",
        proof: Array.from(proofBytes),
        publicInput: publicInputsBytes,
        vmProgramCode: undefined,
        verificationKey: Array.from(vKeyBytes),
        proofGeneratorAddress: user_address,
    };

    return verificationData;
}
