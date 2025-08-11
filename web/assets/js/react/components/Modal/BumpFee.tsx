import React from "react";
import { Modal } from ".";
import { Button } from "..";

type BumpChoice = "instant" | "default" | "custom";

type Props = {
    open: boolean;
    setOpen: (open: boolean) => void;

    defaultFeeWei: bigint | null;
    instantFeeWei: bigint | null;

    choice: BumpChoice;
    setChoice: (c: BumpChoice) => void;

    customGwei: string;
    setCustomGwei: (v: string) => void;

    toWeiFromGwei: (gweiStr: string) => bigint | null;
    toGwei: (wei: bigint) => number;

    onConfirm: () => Promise<void> | void;

    isConfirmLoading?: boolean;
    maxWidth?: number;
};

export const BumpFeeModal: React.FC<Props> = ({
    open,
    setOpen,
    defaultFeeWei,
    instantFeeWei,
    choice,
    setChoice,
    customGwei,
    setCustomGwei,
    toWeiFromGwei,
    toGwei,
    onConfirm,
    isConfirmLoading = false,
    maxWidth = 520,
}) => {
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

            <div className="mt-6 flex justify-end gap-3">
            <Button variant="contrast" onClick={() => setOpen(false)}>
                Cancel
            </Button>
            <Button
                variant="accent-fill"
                onClick={onConfirm}
                isLoading={isConfirmLoading}
                disabled={
                isConfirmLoading || (choice === "custom" && !toWeiFromGwei(customGwei))
                }
            >
                Confirm
            </Button>
            </div>
        </div>
        </Modal>
    );
};
