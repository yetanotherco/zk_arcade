import React from "react";
import { ProofSubmission } from "../../../types/aligned";

type Props = {
	proofs: {
		beforeBump: ProofSubmission;
		afterBump: ProofSubmission;
	}[];
};

export const BumpResult = ({ proofs }: Props) => {
	return <div>Bump result</div>;
};
