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
    const gasCostGwei = useGasCost();

    if (!ethPrice || !gasCostGwei) {
        return <div>Loading...</div>;
    }

    return (
        <>
            <div className="">
                <h2 className="text-2xl font-bold mb-4">Aligned Savings</h2>
                <p>
                    With {proofs} proofs of {proof_type}, the estimated savings are:
                </p>
                <p className="text-xl font-semibold">
                    Base Cost: {calcAlignedSavings(proofs, proof_type, ethPrice, gasCostGwei, proofsPerBatch).baseCost} ETH
                </p>
                <p className="text-xl font-semibold">
                    Aligned Cost: {calcAlignedSavings(proofs, proof_type, ethPrice, gasCostGwei, proofsPerBatch).alignedCost} ETH
                </p>
                <p className="text-xl font-semibold">
                    Savings: {calcAlignedSavings(proofs, proof_type, ethPrice, gasCostGwei, proofsPerBatch).savings} ETH
                </p>
                <p className="text-sm text-gray-500">
                    Note: These calculations are based on current gas prices and may vary.
                </p>
            </div>
        </>
    );
}
