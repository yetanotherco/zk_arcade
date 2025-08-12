import React, { useEffect, useState } from "react";
import { Modal } from ".";
import { Button } from "..";

type BumpChoice = "instant" | "default" | "custom";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;
    estimateMaxFeeForBatchOfProofs: (blocks: number) => Promise<bigint | null>;
    onConfirm: (chosenWei: bigint) => Promise<void> | void;
    onError: (message: string) => void;
    isConfirmLoading?: boolean;
    maxWidth?: number;
};

export const BumpFeeModal: React.FC<Props> = ({
    open,
    setOpen,
    estimateMaxFeeForBatchOfProofs,
    onConfirm,
    onError,
    isConfirmLoading = false,
    maxWidth = 520,
}) => {
    const [choice, setChoice] = useState<BumpChoice>("default");
    const [customGwei, setCustomGwei] = useState<string>("");
    const [defaultFeeWei, setDefaultFeeWei] = useState<bigint | null>(null);
    const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);
    const [estimating, setEstimating] = useState(false);
    const [hasEstimatedOnce, setHasEstimatedOnce] = useState(false);

    const toWeiFromGwei = (gweiStr: string): bigint | null => {
        if (!gweiStr.trim()) return null;
        const n = Number(gweiStr);
        if (!isFinite(n) || n <= 0) return null;
        return BigInt(Math.floor(n * 1e9));
    };

    const toGwei = (wei: bigint) => Number(wei) / 1e9;

    // Estimate fees when modal opens
    useEffect(() => {
        if (!open) return;
        
        const estimateFees = async () => {
            try {
                setEstimating(true);
                const estimatedDefault = await estimateMaxFeeForBatchOfProofs(16);
                const estimatedInstant = await estimateMaxFeeForBatchOfProofs(1);
                
                if (!estimatedDefault) {
                    onError("Could not estimate the fee. Please try again in a few seconds.");
                    setOpen(false);
                    return;
                }
                
                setDefaultFeeWei(estimatedDefault);
                setInstantFeeWei(estimatedInstant);
                
                // Solo resetear a default la primera vez que se estiman las fees
                if (!hasEstimatedOnce) {
                    setChoice("default");
                    setCustomGwei("");
                    setHasEstimatedOnce(true);
                }
            } catch {
                onError("Could not estimate the fee. Please try again in a few seconds.");
                setOpen(false);
            } finally {
                setEstimating(false);
            }
        };

        estimateFees();
    }, [open, estimateMaxFeeForBatchOfProofs, onError, setOpen, hasEstimatedOnce]);

    const handleConfirm = async () => {
        let chosenWei: bigint | null = null;
        
        if (choice === "default") {
            chosenWei = defaultFeeWei;
        } else if (choice === "instant") {
            chosenWei = instantFeeWei;
        } else if (choice === "custom") {
            chosenWei = toWeiFromGwei(customGwei);
        }

        if (!chosenWei || chosenWei <= 0n) {
            onError("Please enter a value greater than 0 Gwei.");
            return;
        }

        await onConfirm(chosenWei);
    };

    return (
        <Modal
            open={open}
            setOpen={setOpen}
            maxWidth={maxWidth}
            shouldCloseOnEsc
            shouldCloseOnOutsideClick
        >
            <div className="rounded-2xl bg-background p-6 text-white">
                <h3 className="text-xl font-semibold mb-4">Bump Fee</h3>
                <p className="text-sm opacity-80 mb-4">
                    Choose how much you want to increase the fee to retry your proof.
                </p>

                {estimating ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-sm opacity-80">Estimating fees...</div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        <label
                            className={`cursor-pointer rounded-xl border p-3 ${
                                choice === "instant" ? "border-accent-100" : "border-contrast-100/40"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="bump"
                                        className="cursor-pointer"
                                        checked={choice === "instant"}
                                        onChange={() => setChoice("instant")}
                                    />
                                    <span className="font-medium">Instant</span>
                                </div>
                                <span className="text-sm opacity-80">
                                    {instantFeeWei ? `${toGwei(instantFeeWei).toFixed(2)} Gwei` : "…"}
                                </span>
                            </div>
                            <p className="mt-1 text-xs opacity-70">
                                Highest fee (fastest confirmation).
                            </p>
                        </label>

                        <label
                            className={`cursor-pointer rounded-xl border p-3 ${
                                choice === "default" ? "border-accent-100" : "border-contrast-100/40"
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="bump"
                                        className="cursor-pointer"
                                        checked={choice === "default"}
                                        onChange={() => setChoice("default")}
                                    />
                                    <span className="font-medium">Default</span>
                                </div>
                                <span className="text-sm opacity-80">
                                    {defaultFeeWei ? `${toGwei(defaultFeeWei).toFixed(2)} Gwei` : "…"}
                                </span>
                            </div>
                            <p className="mt-1 text-xs opacity-70">Recommended fee.</p>
                        </label>

                        <div
                            className={`rounded-xl border p-3 ${
                                choice === "custom" ? "border-accent-100" : "border-contrast-100/40"
                            }`}
                        >
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="bump"
                                    className="cursor-pointer"
                                    checked={choice === "custom"}
                                    onChange={() => setChoice("custom")}
                                />
                                <span className="font-medium">Custom</span>
                            </label>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="Enter the fee in Gwei"
                                    className="w-full rounded-lg bg-contrast-100/10 px-3 py-2 outline-none"
                                    value={customGwei}
                                    onChange={(e) => {
                                        setChoice("custom");
                                        setCustomGwei(e.target.value);
                                    }}
                                />
                                <span className="text-sm opacity-80">Gwei</span>
                            </div>
                            <p className="mt-1 text-xs opacity-70">Define your own max fee.</p>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <Button variant="contrast" onClick={() => setOpen(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="accent-fill"
                        onClick={handleConfirm}
                        isLoading={isConfirmLoading}
                        disabled={
                            isConfirmLoading || 
                            estimating || 
                            (choice === "custom" && !toWeiFromGwei(customGwei))
                        }
                    >
                        Confirm
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
