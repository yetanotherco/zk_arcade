import React from "react";
import { weiToEthNumber } from "../../../utils/conversion";
import { ProofBumpResult } from "./helpers";
type Props = {
	proofs: ProofBumpResult[];
};

const formatFee = (wei: bigint) => {
	try {
		const eth = weiToEthNumber(wei);
		return `${eth.toLocaleString(undefined, {
			maximumFractionDigits: 6,
		})} ETH`;
	} catch {
		return "-";
	}
};

export const BumpResult = ({ proofs }: Props) => {
	if (!proofs.length) {
		return (
			<div className="text-sm opacity-70">
				No proofs selected to bump yet.
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center gap-4 overflow-scroll max-h-[200px]">
			{proofs.map((proof, idx) => {
				const previousFee = formatFee(proof.previous_max_fee);
				const newFee = formatFee(proof.new_max_fee);
				const isSameFee = proof.new_max_fee === proof.previous_max_fee;

				return (
					<div className="border border-contrast-100/20 rounded-lg p-4 flex flex-col gap-2">
						<div className="text-xs uppercase tracking-wide opacity-60">
							Proof {idx}
						</div>

						<div className="flex items-center gap-3 text-sm">
							<div className="flex flex-col">
								<span className="uppercase text-xs opacity-60">
									Before
								</span>
								<span>{previousFee}</span>
							</div>
							<span className="text-xs opacity-50">-&gt;</span>
							<div className="flex flex-col">
								<span className="uppercase text-xs opacity-60">
									After
								</span>
								<span
									className={`text-accent-100 font-medium${
										isSameFee ? " opacity-40" : ""
									}`}
								>
									{newFee}
								</span>
								{isSameFee && (
									<span className="text-xs uppercase tracking-wide opacity-60">
										No bump needed
									</span>
								)}
							</div>
						</div>
					</div>
				);
			})}
		</div>
	);
};
