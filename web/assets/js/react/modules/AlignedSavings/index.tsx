import React from "react";
import ShowProofSavings from "./ShowProofsSavings";

type Props = {
	proofs: number;
	proof_type: string;
	gas_cost_gwei: number;
	proofsPerBatch?: number;
};

export default ({ proofs, proof_type, gas_cost_gwei, proofsPerBatch }: Props) => {
	return (
		<>
			<ShowProofSavings
				proofs={proofs}
				proof_type={proof_type}
				gas_cost_gwei={gas_cost_gwei}
				proofsPerBatch={proofsPerBatch}
			/>
		</>
	);
};
