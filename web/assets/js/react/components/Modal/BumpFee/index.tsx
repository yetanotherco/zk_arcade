import React, { useEffect, useState } from "react";
import { useAligned, useEthPrice } from "../../../hooks";
import { useToast } from "../../../state/toast";
import { Modal } from "../Modal";
import { BumpSelector } from "./BumpSelector";
import { BumpResult } from "./BumpResult";
import { ethStrToWei, weiToEthNumber } from "../../../utils/conversion";
import { BumpChoice, isCustomFeeValid, ProofBumpResult } from "./helpers";
import { Button } from "../../Button";
import { PendingProofToBump } from "../../../hooks/usePendingProofsToBump";
import { fetchProofVerificationData } from "../../../utils/aligned";
import { NoncedVerificationdata, SubmitProof } from "../../../types/aligned";
import { toHex } from "viem";
import { Address } from "../../../types/blockchain";

type Props = {
	maxFeeLimit: bigint;
	open: boolean;
	setOpen: (open: boolean) => void;
	proofsToBump: PendingProofToBump[];
	proofsToBumpIsLoading: boolean;
	paymentServiceAddr: Address;
};

export const BumpFeeModal = ({
	maxFeeLimit,
	open,
	setOpen,
	proofsToBump,
	proofsToBumpIsLoading,
	paymentServiceAddr,
}: Props) => {
	const { price } = useEthPrice();
	const [choice, setChoice] = useState<BumpChoice>("suggested");
	const [customEth, setCustomEth] = useState<string>("");
	const [suggestedFeeWei, setSuggestedFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);
	const [estimating, setEstimating] = useState(false);
	const [hasEstimatedOnce, setHasEstimatedOnce] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [lastTimeSubmitted, setLastTimeSubmitted] = useState("2025-24-09");
	const [proofsBumpingResult, setProofsBumpingResult] = useState<
		ProofBumpResult[]
	>([]);
	const { signVerificationData } = useAligned();

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
			// TODO: here get the default and it is lower than the first one bump to the first one
			// if not bump everything to the first one instead
			const estimateSuggested = await estimateMaxFeeForBatchOfProofs(16);
			const estimatedInstant = await estimateMaxFeeForBatchOfProofs(
				proofsToBump.length || 1
			);

			if (!estimateSuggested) {
				handleBumpError(
					"Could not estimate the fee. Please try again in a few seconds."
				);
				return;
			}

			setSuggestedFeeWei(estimateSuggested);
			setInstantFeeWei(estimatedInstant);

			if (!hasEstimatedOnce) {
				setChoice("suggested");
				setCustomEth("");
				setHasEstimatedOnce(true);
			}

			const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
				const newMaxFee =
					(choice === "instant"
						? estimatedInstant
						: estimateSuggested) || 0n;

				return {
					id: p.id,
					new_max_fee: newMaxFee,
					previous_max_fee: BigInt(p.submitted_max_fee),
				};
			});

			setProofsBumpingResult(bumpingResult);
		} catch {
			handleBumpError(
				"Could not estimate the fee. Please try again in a few seconds."
			);
		} finally {
			setEstimating(false);
		}
	};

	useEffect(() => {
		if (!proofsToBump.length) {
			return;
		}
		if (hasEstimatedOnce) {
			setChoice("suggested");
			setCustomEth("");
		}
		estimateFees();
	}, [estimateMaxFeeForBatchOfProofs, hasEstimatedOnce, proofsToBump]);

	const handleConfirm = async () => {
		let chosenWei: bigint | null = null;

		if (choice === "suggested") {
			chosenWei = suggestedFeeWei;
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

		const submitProofMessages: SubmitProof[] = [];
		// TODO: see if possible to sign all transactions in a single call
		for (const proof of proofsBumpingResult) {
			const res = await fetchProofVerificationData(proof.id);
			if (!res) {
				setIsLoading(false);
				addToast({
					title: "There was a problem while sending the proof",
					desc: "Please try again.",
					type: "error",
				});
				return;
			}
			const noncedVerificationData: NoncedVerificationdata =
				res.verification_data;

			noncedVerificationData.maxFee = toHex(chosenWei, { size: 32 });

			const { r, s, v } = await signVerificationData(
				noncedVerificationData,
				paymentServiceAddr
			);

			const submitProofMessage: SubmitProof = {
				verificationData: noncedVerificationData,
				signature: {
					r,
					s,
					v: Number(v),
				},
			};

			submitProofMessages.push(submitProofMessage);
		}

		// TODO: send each proof one by one

		setOpen(false);
	};

	const handleSetCustomEth = (newValue: string) => {
		const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
			const newMaxFee = ethStrToWei(newValue) || 0n;

			return {
				id: p.id,
				previous_max_fee: BigInt(p.submitted_max_fee),
				new_max_fee: newMaxFee,
			};
		});

		setProofsBumpingResult(bumpingResult);
		setCustomEth(newValue);
	};

	const handleChoiceChange = (choice: BumpChoice) => {
		const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
			const newMaxFee =
				(choice === "instant"
					? instantFeeWei
					: choice === "suggested"
					? suggestedFeeWei
					: ethStrToWei(customEth)) || 0n;

			return {
				id: p.id,
				new_max_fee: newMaxFee,
				previous_max_fee: BigInt(p.submitted_max_fee),
			};
		});
		setProofsBumpingResult(bumpingResult);
		setChoice(choice);
	};

	return (
		<Modal open={open} setOpen={setOpen} maxWidth={1000}>
			<div className="bg-contrast-100 p-10 rounded flex flex-col gap-6">
				<BumpSelector
					choice={choice}
					customEth={customEth}
					setCustomEth={handleSetCustomEth}
					suggestedFeeWei={suggestedFeeWei || 0n}
					estimating={estimating}
					instantFeeWei={instantFeeWei || 0n}
					isLoading={isLoading}
					lastTimeSubmitted={lastTimeSubmitted}
					maxFeeLimit={maxFeeLimit}
					price={price || 0}
					setChoice={handleChoiceChange}
				/>
				{proofsToBumpIsLoading ? (
					<></>
				) : (
					<>
						<p>Bumping overview:</p>
						<div className="h-[2px] bg-gray-300 w-full"></div>
						<BumpResult proofs={proofsBumpingResult} />
					</>
				)}
				<Button
					variant="accent-fill"
					onClick={handleConfirm}
					disabled={
						proofsToBumpIsLoading ||
						isLoading ||
						estimating ||
						(choice === "custom" &&
							(!ethStrToWei(customEth) ||
								!isCustomFeeValid(customEth, maxFeeLimit)))
					}
				>
					Confirm
				</Button>
			</div>
		</Modal>
	);
};
