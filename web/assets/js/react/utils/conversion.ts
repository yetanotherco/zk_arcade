export const ethStrToWei = (ethStr: string): bigint | null => {
	const s = ethStr.trim();
	if (!s) return null;
	const [intPart, fracPart = ""] = s.split(".");
	const fracPadded = (fracPart + "0".repeat(18)).slice(0, 18);
	try {
		return BigInt(intPart) * 10n ** 18n + BigInt(fracPadded);
	} catch {
		return null;
	}
};

export const weiToEthNumber = (wei: bigint) => Number(wei) / 1e18;

export const calculateUsdFromEthString = (
	ethStr: string,
	ethPrice: number | null
): string => {
	if (!ethStr || !ethPrice) return "0";

	const wei = ethStrToWei(ethStr);
	if (!wei) return "0";

	const priceInWei = BigInt(Math.round(ethPrice * 1e18));
	const usdInWei = (wei * priceInWei) / 10n ** 18n;
	const usdValue = Number(usdInWei) / 1e18;

	return usdValue.toLocaleString(undefined, {
		maximumFractionDigits: 18,
		minimumFractionDigits: 0,
	});
};
