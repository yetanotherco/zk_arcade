import { getAddress, pad, toBytes, toHex } from "viem";
import * as snarkjs from "snarkjs";
import { readFile } from "fs/promises";
import { TextEncoder } from "util";
import path from "path";

import { encode as cborEncode, decode as cborDecode } from 'cbor2';
import { hexToBigInt } from "viem";

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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

export async function generateCircomParityProof(user_address, userPositions, levelsBoards, privateKey) {
    let nonce = BigInt(0);
    try {
        nonce = await getBatcherNonce("http://localhost:8080", user_address);
        console.log("Nonce:", nonce.toString());
    } catch (err) {
        console.error("Error:", err);
    }

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

	const maxFee = await estimateMaxFeeForBatchOfProofs(16);
	if (!maxFee) {
		alert("Could not estimate max fee");
		return;
	}

    const chainId = 31337; // Anvil chain id
    const payment_service_addr = getAddress("0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650");

    const noncedVerificationdata = {
        maxFee: toHex(maxFee, { size: 32 }),
        nonce: toHex(nonce, { size: 32 }),
        chain_id: toHex(chainId, { size: 32 }),
        payment_service_addr,
        verificationData,
    };

    const { r, s, v } = await signVerificationData(
        privateKey,
        noncedVerificationdata,
        payment_service_addr
    );

    const submitProofMessage = {
        verificationData: noncedVerificationdata,
        signature: {
            r,
            s,
            v: Number(v),
        },
    };

    return JSON.stringify(submitProofMessage);
}

async function estimateMaxFeeForBatchOfProofs(numberProofsInBatch = 16) {
    // TODO: Fetch gas price from an RPC

    // const totalGas =
    //     GAS_ESTIMATION.DEFAULT_CONSTANT_GAS_COST +
    //     GAS_ESTIMATION.ADDITIONAL_SUBMISSION_GAS_COST_PER_PROOF *
    //         BigInt(numberProofsInBatch);

    // const estimatedGasPerProof =
    //     BigInt(totalGas) / BigInt(numberProofsInBatch);

    // const feePerProof =
    // (estimatedGasPerProof *
    //     gasPrice *
    //     BigInt(GAS_ESTIMATION.GAS_PRICE_PERCENTAGE_MULTIPLIER)) /
    // BigInt(GAS_ESTIMATION.PERCENTAGE_DIVIDER);

    return BigInt(593450004154150);
}

// TODO: Move to a separate file
import WebSocket from "ws";

export async function getBatcherNonce(batcher_url, address) {
    return new Promise((resolve, reject) => {
        if (!address) {
            return reject(new Error("No address provided"));
        }

        const ws = new WebSocket(batcher_url);
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            console.log("WebSocket connection established");
        };

        ws.onmessage = (event) => {
        try {
            const cbor_data = event.data;
            const data = cborDecode(new Uint8Array(cbor_data));

            if (data?.ProtocolVersion) {
                const message = { GetNonceForAddress: address };
                const encoded = cborEncode(message).buffer;
                ws.send(encoded);
            } else if (data?.Nonce) {
                ws.close();
                resolve(hexToBigInt(data.Nonce));
            } else if (data?.EthRpcError || data?.InvalidRequest) {
                ws.close();
                reject(new Error(JSON.stringify(data)));
            }
        } catch (e) {
            ws.close();
            reject(e);
        }
        };

        ws.onerror = () => {
            ws.close();
            reject(new Error("WebSocket connection error"));
        };

        ws.onclose = () => {};
    });
}


async function signVerificationData(
    privateKey,
    noncedVerificationData,
    payment_service_addr,
    opts = {}
) {
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({ account, transport: http("http://localhost:8545") });

    const toHex = (x) => {
        if (typeof x === "string") return x.startsWith("0x") ? x : `0x${Buffer.from(x, "utf8").toString("hex")}`;
        return `0x${Buffer.from(x).toString("hex")}`;
    };

    const message = {
        verification_data_hash: toHex(
            computeVerificationDataCommitment(noncedVerificationData.verificationData).commitmentDigest
        ),
        nonce: noncedVerificationData.nonce,
        max_fee: noncedVerificationData.maxFee,
    };

    const domain = eip712Domain(Number(noncedVerificationData.chain_id), payment_service_addr);

    const signature = await client.signTypedData({
        account,
        domain,
        types: eip712Types,
        primaryType: "NoncedVerificationData",
        message,
    });

    const r = `0x${signature.slice(2, 66)}`;
    const s = `0x${signature.slice(66, 130)}`;
    let v = parseInt(signature.slice(130, 132), 16);

    if (opts.normalizeV) v = v === 0 || v === 1 ? v + 27 : v;
    if (!Number.isFinite(v)) throw new Error("Failure obtaining the sign, v is undefined");

    return { r, s, v, signature };
}

import { Keccak } from "sha3";

export const provingSystemNameToByte = {
    GnarkPlonkBls12_381: 0,
    GnarkPlonkBn254: 1,
    GnarkGroth16Bn254: 2,
    SP1: 3,
    Risc0: 4,
    CircomGroth16Bn256: 5,
};

function hexStringToBytes(hex) {
	if (hex.startsWith("0x")) hex = hex.slice(2);
	if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < bytes.length; i++) {
		bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	}
	return bytes;
}

export const computeVerificationDataCommitment = (verificationData) => {
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

    let provingSystemAuxDataCommitment = Buffer.from(
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

export const eip712Domain = (chainId, batcherPaymentServiceAddress) => ({
    name: "Aligned",
    version: "1",
    chainId,
    verifyingContract: batcherPaymentServiceAddress,
});

export const eip712Types = {
    NoncedVerificationData: [
        { name: "verification_data_hash", type: "bytes32" },
        { name: "nonce", type: "uint256" },
        { name: "max_fee", type: "uint256" },
    ],
};
