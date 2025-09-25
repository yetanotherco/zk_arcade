import React, { useEffect, useState } from "react";
import { useAligned, useEthPrice } from "../../../hooks";
import { useToast } from "../../../state/toast";
import { Modal } from "../Modal";
import { BumpSelector } from "./BumpSelector";
import { BumpResult } from "./BumpResult";
import { ethStrToWei, weiToEthNumber } from "../../../utils/conversion";
import { BumpChoice } from "./helpers";
import { Button } from "../../Button";
import { PendingProofToBump } from "../../../hooks/usePendingProofsToBump";

type Props = {
	maxFeeLimit: bigint;
	open: boolean;
	setOpen: (open: boolean) => void;
	proofsToBump: PendingProofToBump[];
};

export const BumpFeeModal = ({
	maxFeeLimit,
	open,
	setOpen,
	proofsToBump,
}: Props) => {
	const { price } = useEthPrice();
	const [choice, setChoice] = useState<BumpChoice>("suggested");
	const [customEth, setCustomEth] = useState<string>("");
	const [defaultFeeWei, setDefaultFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);
	const [estimating, setEstimating] = useState(false);
	const [hasEstimatedOnce, setHasEstimatedOnce] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [lastTimeSubmitted, setLastTimeSubmitted] = useState("2025-24-09");

	const { addToast } = useToast();
	const { estimateMaxFeeForBatchOfProofs } = useAligned();

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
				handleBumpError(
					"Could not estimate the fee. Please try again in a few seconds."
				);
				return;
			}

			setDefaultFeeWei(estimatedDefault);
			setInstantFeeWei(estimatedInstant);

			if (!hasEstimatedOnce) {
				setChoice("suggested");
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
			setChoice("suggested");
			setCustomEth("");
		}
		estimateFees();
	}, [estimateMaxFeeForBatchOfProofs, hasEstimatedOnce]);

	const handleConfirm = async () => {
		let chosenWei: bigint | null = null;

		if (choice === "suggested") {
			chosenWei = defaultFeeWei;
		} else if (choice === "instant") {
			chosenWei = instantFeeWei;
		} else if (choice === "custom") {
			chosenWei = ethStrToWei(customEth);
			if (!chosenWei || chosenWei <= maxFeeLimit) {
				handleBumpError(
					`The fee must be greater than the current fee of ${weiToEthNumber(
						maxFeeLimit
					)} ETH.`
				);
				return;
			}
		}

		if (!chosenWei || chosenWei <= 0n) {
			handleBumpError("Please enter a value greater than 0 ETH.");
			return;
		}

		setOpen(false);
	};

	return (
		<Modal open={open} setOpen={setOpen} maxWidth={1000}>
			<BumpSelector
				choice={choice}
				customEth={customEth}
				setCustomEth={setCustomEth}
				defaultFeeWei={defaultFeeWei || 0n}
				estimating={estimating}
				instantFeeWei={instantFeeWei || 0n}
				isLoading={isLoading}
				lastTimeSubmitted={lastTimeSubmitted}
				maxFeeLimit={maxFeeLimit}
				price={price || 0}
				setChoice={setChoice}
			/>
			<Button variant="accent-fill" onClick={handleConfirm}>
				Confirm
			</Button>
			<div className="h-[2px] bg-black w-full"></div>
			<BumpResult proofs={[]} />
		</Modal>
	);
};
