import React from "react";
import { calcAlignedSavings } from "../../utils/aligned";

type Props = {
	proofs: number;
	proofType: string;
	ethPrice: number;
	gasCostGwei: number;
	proofsPerBatch?: number;
};

export default ({ proofs, proofType, ethPrice, gasCostGwei, proofsPerBatch }: Props) => {
    return (
        <>
            <div className="">
                <h2 className="text-2xl font-bold mb-4">Aligned Savings</h2>
                <p>
                    With {proofs} proofs of {proofType}, the estimated savings are:
                </p>
                <p className="text-xl font-semibold">
                    Base Cost: {calcAlignedSavings(proofs, proofType, ethPrice, gasCostGwei, proofsPerBatch).baseCost} ETH
                </p>
                <p className="text-xl font-semibold">
                    Aligned Cost: {calcAlignedSavings(proofs, proofType, ethPrice, gasCostGwei, proofsPerBatch).alignedCost} ETH
                </p>
                <p className="text-xl font-semibold">
                    Savings: {calcAlignedSavings(proofs, proofType, ethPrice, gasCostGwei, proofsPerBatch).savings} ETH
                </p>
                <p className="text-sm text-gray-500">
                    Note: These calculations are based on current gas prices and may vary.
                </p>
            </div>
        </>
    );
}
