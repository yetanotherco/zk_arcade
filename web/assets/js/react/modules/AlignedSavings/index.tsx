import React from "react";
import ShowProofSavings from "./ShowProofsSavings";

type Props = {
	proofs: number;
	proofType: string;
	proofsPerBatch?: number;
};

export default ({ proofs, proofType, proofsPerBatch }: Props) => {
	return (
		<>
			<ShowProofSavings
				proofs={proofs}
				proofType={proofType}
				proofsPerBatch={proofsPerBatch}
			/>
		</>
	);
};
