import React, { useEffect, useState } from "react";
import { Modal } from ".";
import { Button } from "..";
import { useAligned, useEthPrice } from "../../hooks";
import { useToast } from "../../state/toast";
import { timeAgoInHs } from "../../utils/date";

type BumpChoice = "instant" | "default" | "custom";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onConfirm: (chosenWei: bigint) => Promise<void> | void;
    isConfirmLoading?: boolean;
    maxWidth?: number;
    previousMaxFee: string;
    lastTimeSubmitted: string;
};

export const BumpFeeModal = ({
    open,
    setOpen,
    onConfirm,
    isConfirmLoading = false,
    maxWidth = 520,
    previousMaxFee,
    lastTimeSubmitted,
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
            const estimatedDefault = await estimateMaxFeeForBatchOfProofs(16);
            const estimatedInstant = await estimateMaxFeeForBatchOfProofs(1);

            if (!estimatedDefault) {
                handleBumpError("Could not estimate the fee. Please try again in a few seconds.");
                setOpen(false);
                return;
            }

            setDefaultFeeWei(estimatedDefault);
            setInstantFeeWei(estimatedInstant);

            if (!hasEstimatedOnce) {
                setChoice("default");
                setCustomEth("");
                setHasEstimatedOnce(true);
            }
        } catch {
            handleBumpError("Could not estimate the fee. Please try again in a few seconds.");
            setOpen(false);
        } finally {
            setEstimating(false);
        }
    };

    useEffect(() => {
        if (!open) return;
        if (hasEstimatedOnce) {
            setChoice("default");
            setCustomEth("");
        }
        estimateFees();
    }, [open, estimateMaxFeeForBatchOfProofs, hasEstimatedOnce]);

    const handleConfirm = async () => {
        let chosenWei: bigint | null = null;

        if (choice === "default") {
            chosenWei = defaultFeeWei;
        } else if (choice === "instant") {
            chosenWei = instantFeeWei;
        } else if (choice === "custom") {
            chosenWei = ethStrToWei(customEth);
            if (!chosenWei || chosenWei <= previousMaxFeeWei) {
                handleBumpError(`The fee must be greater than the current fee of ${weiToEthNumber(previousMaxFeeWei)} ETH.`);
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
        const isCustomFeeInputValid = choice === "custom" ? isCustomFeeValid(customEth) : true;

        return (
            <div className="flex flex-col gap-3">
                <p className="text-xs bg-yellow gap-2 rounded w-fit p-1 px-2" style={{ color: "black" }}>
                    {timeAgoInHs(lastTimeSubmitted) > 6
                        ? (<>We suggest bumping the fee, since the proof was submitted more than 6 hours ago.</>)
                        : (<>We recommend waiting before bumping the fee, the proof was submitted within the last 6 hours.</>)
                    }
                </p>

                <div className="p-3 bg-contrast-100/10 rounded-lg">
                    <div className="text-sm opacity-80">Previous submitted max fee:</div>
                    <div className="font-medium">{currentFeeEth} ETH</div>
                </div>

                <label
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        choice === "instant" ? "border-accent-100" : "border-contrast-100/40"
                    } ${isConfirmLoading ? "opacity-50 pointer-events-none" : ""}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="bump"
                                className="cursor-pointer"
                                checked={choice === "instant"}
                                onChange={() => !isConfirmLoading && setChoice("instant")}
                                disabled={isConfirmLoading}
                            />
                            <span className="font-medium">Instant</span>
                        </div>
                        <span className="text-sm opacity-80">
                            {instantFeeWei ? `${weiToEthNumber(instantFeeWei)} ETH` : "…"}
                        </span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                        ~{((price || 0) * Number(instantFeeWei) / 1e18).toLocaleString(
                            undefined,
                            {
                                maximumFractionDigits: 3,
                            }
                        )}{" "}
                        USD
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                        Guarantee inclusion by paying the full price of submitting the batch
                    </p>
                </label>

                <label
                    className={`cursor-pointer rounded-xl border p-3 transition-colors ${
                        choice === "default" ? "border-accent-100" : "border-contrast-100/40"
                    } ${isConfirmLoading ? "opacity-50 pointer-events-none" : ""}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="bump"
                                className="cursor-pointer"
                                checked={choice === "default"}
                                onChange={() => !isConfirmLoading && setChoice("default")}
                                disabled={isConfirmLoading}
                            />
                            <span className="font-medium">Default</span>
                        </div>
                        <span className="text-sm opacity-80">
                            {defaultFeeWei ? `${weiToEthNumber(defaultFeeWei)} ETH` : "…"}
                        </span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                        ~{((price || 0) * Number(defaultFeeWei) / 1e18).toLocaleString(
                            undefined,
                            {
                                maximumFractionDigits: 3,
                            }
                        )}{" "}
                        USD
                    </p>
                    <p className="mt-1 text-xs opacity-70">Recommended fee, estimated for a batch of 16 proofs.</p>
                </label>

                <div
                    className={`rounded-xl border p-3 transition-colors ${
                        choice === "custom" ? "border-accent-100" : "border-contrast-100/40"
                    } ${isConfirmLoading ? "opacity-50 pointer-events-none" : ""} ${
                        choice === "custom" && customEth && !isCustomFeeInputValid ? "border-red-400" : ""
                    }`}
                >
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="bump"
                            className="cursor-pointer"
                            checked={choice === "custom"}
                            onChange={() => !isConfirmLoading && setChoice("custom")}
                            disabled={isConfirmLoading}
                        />
                        <span className="font-medium">Custom</span>
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                        <input
                            type="number"
                            min={currentFeeEth}
                            step="0.000000000000000001"
                            placeholder={`Enter fee > ${currentFeeEth} ETH`}
                            className={`w-full rounded-lg bg-contrast-100/10 px-3 py-2 outline-none disabled:opacity-50 ${
                                choice === "custom" && customEth && !isCustomFeeInputValid ? "border border-red-400" : ""
                            } [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]`}
                            value={customEth}
                            onChange={(e) => {
                                if (!isConfirmLoading) {
                                    setChoice("custom");
                                    setCustomEth(e.target.value);
                                }
                            }}
                            disabled={isConfirmLoading}
                        />
                        <span className="text-sm opacity-80">ETH</span>
                    </div>
                    <p className="mt-1 text-xs opacity-70">
                        ~{((price || 0) * Number(customEth)).toLocaleString(
                            undefined,
                            {
                                maximumFractionDigits: 3,
                            }
                        )}{" "}
                        USD
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                        Define your own max fee (must be greater than the one submitted before).
                    </p>
                    {choice === "custom" && customEth && !isCustomFeeInputValid && (
                        <p className="mt-1 text-xs text-red-400">
                            Fee must be greater than {currentFeeEth} ETH
                        </p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            maxWidth={maxWidth}
            shouldCloseOnEsc={!isConfirmLoading}
            shouldCloseOnOutsideClick={!isConfirmLoading}
        >
            <div className="bg-contrast-100 rounded-2xl p-6 text-white">
                <h3 className="text-xl font-semibold mb-4">Bump Fee</h3>
                <p className="text-sm opacity-80 mb-4">
                    Choose how much you want to increase the fee to retry your proof.
                </p>

                <div className="min-h-[280px]">
                    {renderContent()}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <Button 
                        variant="contrast" 
                        onClick={() => setOpen(false)}
                        disabled={isConfirmLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="accent-fill"
                        onClick={handleConfirm}
                        isLoading={isConfirmLoading}
                        disabled={
                            isConfirmLoading ||
                            estimating ||
                            (choice === "custom" && (!ethStrToWei(customEth) || !isCustomFeeValid(customEth)))
                        }
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
