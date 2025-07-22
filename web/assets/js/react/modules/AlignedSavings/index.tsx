import React from "react";
import ShowProofSavings from "./ShowProofsSavings";

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
			<ShowProofSavings
				proofs={proofs}
				proofType={proofType}
				ethPrice={ethPrice}
				gasCostGwei={gasCostGwei}
				proofsPerBatch={proofsPerBatch}
			/>
		</>
	);
};
