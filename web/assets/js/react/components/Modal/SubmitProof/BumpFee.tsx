import React, { useEffect, useState } from "react";
import { useAligned, useEthPrice } from "../../../hooks";
import { useToast } from "../../../state/toast";
import { timeAgoInHs } from "../../../utils/date";
import { Button } from "../../Button";

type BumpChoice = "instant" | "default" | "custom";

type Props = {
	onConfirm: (chosenWei: bigint) => Promise<void> | void;
	onCancel: () => void;
	isConfirmLoading?: boolean;
	previousMaxFee: string;
	lastTimeSubmitted: string;
	latestMaxFee: bigint | null;
};

const EthPriceWithTooltip = ({
	wei,
	ethPrice,
}: {
	wei: bigint;
	ethPrice: number | null;
}) => {
	const ethValue = Number(wei) / 1e18;
	const usdValue = (ethPrice || 0) * ethValue;

	return (
		<div className="relative group">
			<span>{ethValue} ETH</span>
			<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
				~$
				{usdValue.toLocaleString(undefined, {
					maximumFractionDigits: 3,
				})}{" "}
				USD
				<div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
			</div>
		</div>
	);
};

export const BumpFee = ({
	onConfirm,
	isConfirmLoading = false,
	previousMaxFee,
	lastTimeSubmitted,
	onCancel,
	latestMaxFee,
}: Props) => {
	const { price } = useEthPrice();
	const [choice, setChoice] = useState<BumpChoice>("default");
	const [customEth, setCustomEth] = useState<string>("");
	const [defaultFeeWei, setDefaultFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);
	const [estimating, setEstimating] = useState(false);
	const [hasEstimatedOnce, setHasEstimatedOnce] = useState(false);

	const { addToast } = useToast();
	const { estimateMaxFeeForBatchOfProofs } = useAligned();

	const previousMaxFeeWei = BigInt(previousMaxFee);

	const ethStrToWei = (ethStr: string): bigint | null => {
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

	const weiToEthNumber = (wei: bigint) => Number(wei) / 1e18;

	const calculateUsdFromEthString = (
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

	const isCustomFeeValid = (customEthValue: string): boolean => {
		const customWei = ethStrToWei(customEthValue);
		if (!customWei) return false;
		return customWei > previousMaxFeeWei;
	};

	const handleBumpError = (message: string) => {
		addToast({
			title: "Error",
			desc: message,
			type: "error",
		});
	};

	const estimateFees = async () => {
		try {
			setEstimating(true);
			let estimatedDefault = await estimateMaxFeeForBatchOfProofs(16);
			let estimatedInstant = await estimateMaxFeeForBatchOfProofs(1);

			if (!estimatedDefault) {
				handleBumpError(
					"Could not estimate the fee. Please try again in a few seconds."
				);
				return;
			}

			if (latestMaxFee && estimatedDefault > latestMaxFee) {
				console.warn("Default estimated fee is greater than the latest max fee from batcher, using latest max fee instead");
				console.log({estimatedDefault, latestMaxFee});
				estimatedDefault = latestMaxFee;
			}
			if (estimatedInstant && latestMaxFee && estimatedInstant > latestMaxFee) {
				console.warn("Instant estimated fee is greater than the latest max fee from batcher, using latest max fee instead");
				console.log({estimatedInstant, latestMaxFee});
				estimatedInstant = latestMaxFee;
			}

			setDefaultFeeWei(estimatedDefault);
			setInstantFeeWei(estimatedInstant);

			if (!hasEstimatedOnce) {
				setChoice("default");
				setCustomEth("");
				setHasEstimatedOnce(true);
			}
		} catch {
			handleBumpError(
				"Could not estimate the fee. Please try again in a few seconds."
			);
		} finally {
			setEstimating(false);
		}
	};

	useEffect(() => {
		if (hasEstimatedOnce) {
			setChoice("default");
			setCustomEth("");
		}
		estimateFees();
	}, [estimateMaxFeeForBatchOfProofs, hasEstimatedOnce]);

	const handleConfirm = async () => {
		let chosenWei: bigint | null = null;

		if (choice === "default") {
			chosenWei = defaultFeeWei;
		} else if (choice === "instant") {
			chosenWei = instantFeeWei;
		} else if (choice === "custom") {
			chosenWei = ethStrToWei(customEth);
			if (!chosenWei || chosenWei <= previousMaxFeeWei) {
				handleBumpError(
					`The fee must be greater than the current fee of ${weiToEthNumber(
						previousMaxFeeWei
					)} ETH.`
				);
				return;
			}
		}

		if (!chosenWei || chosenWei <= 0n) {
			handleBumpError("Please enter a value greater than 0 ETH.");
			return;
		}

		await onConfirm(chosenWei);
	};

	const renderContent = () => {
		if (estimating) {
			return (
				<div className="flex items-center justify-center">
					<div className="text-sm">Estimating fees...</div>
				</div>
			);
		}

		const currentFeeEth = weiToEthNumber(previousMaxFeeWei);
		const isCustomFeeInputValid =
			choice === "custom" ? isCustomFeeValid(customEth) : true;

		return (
			<div className="flex flex-col gap-3">
				<div className="bg-contrast-100/10 rounded-lg">
					<div className="text-sm opacity-80">
						Previous submitted max fee:
					</div>
					<div className="font-medium">
						<EthPriceWithTooltip
							wei={previousMaxFeeWei}
							ethPrice={price}
						/>
					</div>
				</div>

				<label
					className={`cursor-pointer rounded-xl border p-3 transition-colors ${
						choice === "instant"
							? "border-accent-100"
							: "border-contrast-100/40"
					} ${
						isConfirmLoading ? "opacity-50 pointer-events-none" : ""
					}`}
				>
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<input
								type="radio"
								name="bump"
								className="cursor-pointer"
								checked={choice === "instant"}
								onChange={() =>
									!isConfirmLoading && setChoice("instant")
								}
								disabled={isConfirmLoading}
							/>
							<span className="font-medium relative group">
								Instant
								<div
									className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 break-words whitespace-normal max-w-sm min-w-[200px] z-10 pointer-events-none"
									style={{ minWidth: "400px" }}
								>
									Guarantee inclusion by paying the full price
									of submitting the batch
								</div>
							</span>
						</div>
						<span className="text-sm opacity-80">
							{instantFeeWei ? (
								<EthPriceWithTooltip
									wei={instantFeeWei}
									ethPrice={price}
								/>
							) : (
								"…"
							)}
						</span>
					</div>
				</label>

				<label
					className={`cursor-pointer rounded-xl border p-3 transition-colors ${
						choice === "default"
							? "border-accent-100"
							: "border-contrast-100/40"
					} ${
						isConfirmLoading ? "opacity-50 pointer-events-none" : ""
					}`}
				>
					<div className="flex items-center justify-between gap-3">
						<div className="flex items-center gap-2">
							<input
								type="radio"
								name="bump"
								className="cursor-pointer"
								checked={choice === "default"}
								onChange={() =>
									!isConfirmLoading && setChoice("default")
								}
								disabled={isConfirmLoading}
							/>
							<span className="font-medium relative group">
								Default
								<div
									className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 break-words whitespace-normal max-w-sm min-w-[200px] z-10 pointer-events-none"
									style={{ minWidth: "400px" }}
								>
									Recommended fee, estimated for a batch of 16
									proofs
								</div>
							</span>
						</div>
						<span className="text-sm opacity-80">
							{defaultFeeWei ? (
								<EthPriceWithTooltip
									wei={defaultFeeWei}
									ethPrice={price}
								/>
							) : (
								"…"
							)}
						</span>
					</div>
				</label>

				<div
					className={`rounded-xl border p-3 transition-colors ${
						choice === "custom"
							? "border-accent-100"
							: "border-contrast-100/40"
					} ${
						isConfirmLoading ? "opacity-50 pointer-events-none" : ""
					} ${
						choice === "custom" &&
						customEth &&
						!isCustomFeeInputValid
							? "border-red-400"
							: ""
					}`}
				>
					<label className="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="bump"
							className="cursor-pointer"
							checked={choice === "custom"}
							onChange={() =>
								!isConfirmLoading && setChoice("custom")
							}
							disabled={isConfirmLoading}
						/>
						<span className="font-medium relative group">
							Custom
							<div
								className="absolute bottom-full left-0 mb-2 px-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 break-words whitespace-normal max-w-sm min-w-[200px] z-10 pointer-events-none"
								style={{ minWidth: "400px" }}
							>
								Define your own max fee, that must be greater
								than the current max fee of {currentFeeEth} ETH
							</div>
						</span>
					</label>
					<div className="mt-2 flex items-center gap-2">
						<input
							type="number"
							min={currentFeeEth}
							step="0.000000000000000001"
							placeholder={`Enter fee > ${currentFeeEth} ETH`}
							className={`w-full rounded-lg bg-contrast-100/10 px-3 py-2 outline-none disabled:opacity-50 ${
								choice === "custom" &&
								customEth &&
								!isCustomFeeInputValid
									? "border border-red-400"
									: ""
							} [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
							value={customEth}
							onChange={e => {
								if (!isConfirmLoading) {
									setChoice("custom");
									setCustomEth(e.target.value);
								}
							}}
							disabled={isConfirmLoading}
						/>
						<span className="text-sm opacity-80">ETH</span>
					</div>
					{customEth && (
						<p className="mt-1 text-xs opacity-70">
							~${calculateUsdFromEthString(customEth, price)} USD
						</p>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="mt-2">
			<div className="flex items-center gap-3 mb-2">
				<h3 className="text-xl font-semibold mb-3">Bump Fee</h3>

				<div
					className="-mt-1 rounded p-1 group/tooltip relative"
					style={{ backgroundColor: "#525217", color: "#faff60" }}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="1.5"
						stroke="currentColor"
						className="size-6"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 
                                1.948 3.374h14.71c1.73 0 2.813-1.874 
                                1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 
                                0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
						/>
					</svg>

					<span
						className="absolute left-1/2 -translate-x-1/4 mt-2 max-w-sm break-words whitespace-normal opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10"
						style={{ minWidth: "400px" }}
					>
						<p
							className="text-xs bg-yellow gap-2 rounded p-1 px-2 mb-2"
							style={{ color: "black" }}
						>
							{timeAgoInHs(lastTimeSubmitted) > 6 ? (
								<>
									We suggest bumping the fee, since the proof
									was submitted more than 6 hours ago.
								</>
							) : (
								<>
									We recommend waiting before bumping the fee,
									the proof was submitted within the last 6
									hours.
								</>
							)}
						</p>
					</span>
				</div>
			</div>

			<div className="">{renderContent()}</div>

			<div className="mt-6 flex justify-end gap-8">
				<Button variant="text" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					variant="accent-fill"
					onClick={handleConfirm}
					isLoading={isConfirmLoading}
					disabled={
						isConfirmLoading ||
						estimating ||
						(choice === "custom" &&
							(!ethStrToWei(customEth) ||
								!isCustomFeeValid(customEth)))
					}
				>
					Bump
				</Button>
			</div>
		</div>
	);
};
