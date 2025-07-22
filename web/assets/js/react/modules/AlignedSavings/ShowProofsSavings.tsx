import React from "react";
import { calcAlignedSavings } from "../../utils/aligned";
import { useEthPrice } from "../../hooks/";

type Props = {
	proofs: number;
	proof_type: string;
	proofsPerBatch?: number;
};

export default ({ proofs, proof_type, proofsPerBatch }: Props) => {

    const ethPrice = useEthPrice().price;

    // TODO: Implement a hook to fetch gas cost in Gwei using wagmi API
    const gasCostGwei = 12;

    if (!ethPrice || !gasCostGwei) {
        return <div>Loading...</div>;
    }

    if (!proofsPerBatch) {
        proofsPerBatch = 20;
    }

    const alignedSavings = calcAlignedSavings(proofs, proof_type, ethPrice, gasCostGwei, proofsPerBatch);

    return (
        <>
            <div className="">
                <h2 className="text-2xl font-bold mb-4">Aligned Savings</h2>
                <p>
                    The savings of proving with Aligned instead of verifying the proofs in ethereum are the following:

                    With {proofs} total {proof_type} proofs, the estimated savings are:
                </p>
                <p className="text-xl font-semibold mt-4">
                    Base Cost: {alignedSavings.baseCost.toPrecision(6)} USD
                </p>
                <p className="text-xl font-semibold mt-4">
                    Aligned Cost: {alignedSavings.alignedCost.toPrecision(5)} USD
                </p>
                <p className="text-xl font-semibold mt-4">
                    Savings: {alignedSavings.savings.toPrecision(6)} USD
                </p>
                <p className="text-sm text-gray-500">
                    Note: These calculations are based on current gas prices and an estimated gas cost and may vary.
                </p>
            </div>
        </>
    );
}
