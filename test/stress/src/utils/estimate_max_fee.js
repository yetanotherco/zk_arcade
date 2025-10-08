import { createPublicClient, http } from "viem";
import { anvil } from "viem/chains";

import { RPC_URL } from "../constants.js";

export const GAS_ESTIMATION = {
	DEFAULT_CONSTANT_GAS_COST: BigInt(537500),
	ADDITIONAL_SUBMISSION_GAS_COST_PER_PROOF: BigInt(2000),
	GAS_PRICE_PERCENTAGE_MULTIPLIER: BigInt(110),
	PERCENTAGE_DIVIDER: BigInt(100),
};

export async function estimateMaxFeeForBatchOfProofs(numberProofsInBatch = 16) {
    const client = createPublicClient({
        chain: anvil,
        transport: http(RPC_URL),
    });

    const gasPrice = await client.getGasPrice();

    const totalGas =
        GAS_ESTIMATION.DEFAULT_CONSTANT_GAS_COST +
        GAS_ESTIMATION.ADDITIONAL_SUBMISSION_GAS_COST_PER_PROOF *
            BigInt(numberProofsInBatch);

    const estimatedGasPerProof =
        BigInt(totalGas) / BigInt(numberProofsInBatch);

    const feePerProof =
    (estimatedGasPerProof *
        gasPrice *
        BigInt(GAS_ESTIMATION.GAS_PRICE_PERCENTAGE_MULTIPLIER)) /
    BigInt(GAS_ESTIMATION.PERCENTAGE_DIVIDER);

    return feePerProof;
}
