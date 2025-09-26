import { ethStrToWei } from "../../../utils/conversion";

export type BumpChoice = "instant" | "suggested" | "custom";

export type ProofBumpResult = {
	id: string;
	previous_max_fee: bigint;
	new_max_fee: bigint;
	updated_at: string;
	game: string;
	level_reached: number;
};

export const isCustomFeeValid = (
	customEthValue: string,
	prevMaxFee: bigint
): boolean => {
	const customWei = ethStrToWei(customEthValue);
	if (!customWei) return false;
	return customWei > prevMaxFee;
};
