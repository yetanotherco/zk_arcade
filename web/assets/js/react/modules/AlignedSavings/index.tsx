import React from "react";
import ShowProofSavings from "./ShowProofsSavings";

type Props = {
	proofs: number;
	proof_type: string;
	proofsPerBatch?: number;
};

export default ({ proofs, proof_type, proofsPerBatch }: Props) => {
	return (
		<>
			<ShowProofSavings
				proofs={proofs}
				proof_type={proof_type}
				proofsPerBatch={proofsPerBatch}
			/>
		</>
	);
};
