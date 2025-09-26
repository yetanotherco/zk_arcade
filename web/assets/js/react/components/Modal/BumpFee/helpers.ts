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

export const getMinBumpValue = (previous: bigint): bigint => {
	if (previous <= 0n) return previous;
	const increase = (previous * 11n) / 100n;
	return previous + increase;
};

export const isCustomFeeValid = (
	customEthValue: string,
	prevMaxFee: bigint
): boolean => {
	const customWei = ethStrToWei(customEthValue);
	if (!customWei) return false;
	return customWei >= getMinBumpValue(prevMaxFee);
};

// Align requires a bump to be at least 10% than the previous max fee
export const ensureMinBump = (previous: bigint, candidate: bigint): bigint => {
	const minRequired = getMinBumpValue(previous);
	return candidate >= minRequired ? candidate : minRequired;
};
