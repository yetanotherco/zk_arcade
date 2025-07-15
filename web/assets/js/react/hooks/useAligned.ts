import { useCallback } from "react";
import { parseSignature, toHex } from "viem";
import { usePublicClient, useSignTypedData } from "wagmi";
import { NoncedVerificationdata } from "../types/aligned";
import { computeVerificationDataCommitment } from "../utils/aligned";
import {
	eip712Domain,
	eip712Types,
	GAS_ESTIMATION,
} from "../constants/aligned";

export const useAligned = () => {
	const client = usePublicClient();
	const {
		signTypedDataAsync,
		signTypedData,
		reset,
		context,
		variables,
		...signedTypeRest
	} = useSignTypedData();

	const signVerificationData = useCallback(
		async (noncedVerificationData: NoncedVerificationdata) => {
			const verificationDataHash = computeVerificationDataCommitment(
				noncedVerificationData.verificationData
			);

			const message = {
				verification_data_hash: toHex(verificationDataHash),
				nonce: noncedVerificationData.nonce,
				max_fee: noncedVerificationData.maxFee,
			};

			const signature = await signTypedDataAsync({
				domain: eip712Domain(Number(noncedVerificationData.chain_id)),
				types: eip712Types,
				primaryType: "NoncedVerificationData",
				message,
			});

			if (!signature) {
				throw new Error("Failure obtaining the sign");
			}

			const { r, s, v } = parseSignature(signature);

			if (!v) {
				throw new Error("Failure obtaining the sign, v is undefined");
			}
			return { r, s, v };
		},
		[signTypedDataAsync]
	);

	// defaults to a batch of 16 proofs
	const estimateMaxFeeForBatchOfProofs = useCallback(
		async (numberProofsInBatch = 16) => {
			if (!client) {
				return null;
			}
			const gasPrice = await client.getGasPrice();

			const totalGas =
				GAS_ESTIMATION.DEFAULT_CONSTANT_GAS_COST +
				GAS_ESTIMATION.ADDITIONAL_SUBMISSION_GAS_COST_PER_PROOF *
					BigInt(numberProofsInBatch);

			const estimatedGasPerProof =
				BigInt(totalGas) / BigInt(numberProofsInBatch);

			const percentageMultiplier =
				BigInt(GAS_ESTIMATION.GAS_PRICE_PERCENTAGE_MULTIPLIER) /
				BigInt(GAS_ESTIMATION.PERCENTAGE_DIVIDER);

			const feePerProof =
				estimatedGasPerProof * gasPrice * percentageMultiplier;

			return feePerProof;
		},
		[client]
	);

	return {
		signVerificationData,
		estimateMaxFeeForBatchOfProofs,
		...signedTypeRest,
	};
};
