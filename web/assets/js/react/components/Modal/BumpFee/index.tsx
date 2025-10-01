import React, { useEffect, useState } from "react";
import { useAligned, useEthPrice } from "../../../hooks";
import { useToast } from "../../../state/toast";
import { Modal } from "../Modal";
import { BumpSelector } from "./BumpSelector";
import { BumpResult } from "./BumpResult";
import { ethStrToWei } from "../../../utils/conversion";
import {
	BumpChoice,
	ensureMinBump,
	getMinBumpValue,
	isCustomFeeValid,
	ProofBumpResult,
} from "./helpers";
import { Button } from "../../Button";
import { PendingProofToBump } from "../../../hooks/usePendingProofsToBump";
import { fetchProofVerificationData } from "../../../utils/aligned";
import { NoncedVerificationdata, SubmitProof } from "../../../types/aligned";
import { toHex } from "viem";
import { Address } from "../../../types/blockchain";
import { useCSRFToken } from "../../../hooks/useCSRFToken";

type Props = {
	open: boolean;
	setOpen: (open: boolean) => void;
	afterBump?: () => void;
	proofsToBump: PendingProofToBump[];
	proofsToBumpIsLoading: boolean;
	paymentServiceAddr: Address;
};

export const BumpFeeModal = ({
	open,
	setOpen,
	proofsToBump,
	proofsToBumpIsLoading,
	paymentServiceAddr,
	afterBump,
}: Props) => {
	const { price } = useEthPrice();
	const [choice, setChoice] = useState<BumpChoice>("suggested");
	const [customEth, setCustomEth] = useState<string>("");
	const [suggestedFeeWei, setSuggestedFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);
	const [estimating, setEstimating] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [proofsBumpingResult, setProofsBumpingResult] = useState<
		ProofBumpResult[]
	>([]);
	const [bumpableProofsCount, setBumpableProofsCount] = useState(0);
	const [hasPendingBump, setHasPendingBump] = useState(false);

	const { signVerificationData } = useAligned();
	const { csrfToken } = useCSRFToken();
	const { addToast } = useToast();
	const { estimateMaxFeeForBatchOfProofs } = useAligned();

	const handleBumpError = (message: string) => {
		addToast({
			title: "Error",
			desc: message,
			type: "error",
		});
	};

	const updateProofsBumpingState = (nextProofs: ProofBumpResult[]) => {
		let bumpableCount = 0;
		for (const proof of nextProofs) {
			if (proof.new_max_fee !== proof.previous_max_fee) {
				bumpableCount += 1;
			}
		}
		setProofsBumpingResult(nextProofs);
		setBumpableProofsCount(bumpableCount);
		setHasPendingBump(bumpableCount > 0);
	};

	const estimateFees = async () => {
		try {
			setEstimating(true);

			let estimateSuggested =
				(await estimateMaxFeeForBatchOfProofs(16)) || 0n;
			let estimatedInstant =
				(await estimateMaxFeeForBatchOfProofs(
					proofsToBump.length || 1
				)) || 0n;

			if (!estimateSuggested || !proofsToBump.length) {
				handleBumpError(
					"Could not estimate the fee. Please try again in a few seconds."
				);
				return;
			}

			const firstProofPrevMax = BigInt(proofsToBump[0].submitted_max_fee);

			estimateSuggested = ensureMinBump(
				firstProofPrevMax,
				estimateSuggested
			);

			estimatedInstant = ensureMinBump(
				firstProofPrevMax,
				estimatedInstant
			);

			setSuggestedFeeWei(estimateSuggested);
			setInstantFeeWei(estimatedInstant);

			const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
				const previousMaxFee = BigInt(p.submitted_max_fee);
				return {
					id: p.id,
					new_max_fee: estimateSuggested,
					previous_max_fee: previousMaxFee,
					game: p.game,
					level_reached: p.level_reached,
					updated_at: p.updated_at,
				};
			});

			updateProofsBumpingState(bumpingResult);
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
		estimateFees();
	}, [estimateMaxFeeForBatchOfProofs, proofsToBump]);

	const handleConfirm = async () => {
		const submitProofMessages: { msg: SubmitProof; proof_id: string }[] =
			[];

		setIsLoading(true);
		for (const proof of proofsBumpingResult) {
			try {
				if (proof.new_max_fee <= proof.previous_max_fee) {
					continue;
				}

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
				const noncedVerificationData: NoncedVerificationdata = {
					...res.verification_data,
					maxFee: toHex(proof.new_max_fee, { size: 32 }),
				};

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

				submitProofMessages.push({
					msg: submitProofMessage,
					proof_id: proof.id,
				});
			} catch {
				setIsLoading(false);
				return;
			}
		}

		for await (const submitProofMessage of submitProofMessages) {
			try {
				const response = await fetch("/proof/status/retry", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},
					body: new URLSearchParams({
						_csrf_token: csrfToken,
						submit_proof_message: JSON.stringify(
							submitProofMessage.msg
						),
						proof_id: submitProofMessage.proof_id,
					}),
				});

				if (!response.ok) {
					throw new Error(`Request failed: ${response.status}`);
				}

				setIsLoading(false);
			} catch (error) {
				setIsLoading(false);
			}
		}

		afterBump && afterBump();
		setOpen(false);
	};

	const handleSetCustomEth = (newValue: string) => {
		const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
			const newMaxFee = ethStrToWei(newValue) || 0n;

			return {
				id: p.id,
				previous_max_fee: BigInt(p.submitted_max_fee),
				new_max_fee: newMaxFee,
				game: p.game,
				level_reached: p.level_reached,
				updated_at: p.updated_at,
			};
		});

		updateProofsBumpingState(bumpingResult);
		setCustomEth(newValue);
	};

	const handleChoiceChange = (choice: BumpChoice) => {
		const newMaxFee =
			(choice === "instant"
				? instantFeeWei
				: choice === "suggested"
				? suggestedFeeWei
				: ethStrToWei(customEth)) || 0n;

		const bumpingResult = proofsToBump.map<ProofBumpResult>(p => {
			return {
				id: p.id,
				new_max_fee: newMaxFee,
				previous_max_fee: BigInt(p.submitted_max_fee),
				game: p.game,
				level_reached: p.level_reached,
				updated_at: p.updated_at,
			};
		});
		updateProofsBumpingState(bumpingResult);
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
					lastTimeSubmitted={proofsToBump[0]?.updated_at}
					price={price || 0}
					maxFeeLimit={BigInt(
						proofsToBump[0]?.submitted_max_fee || 0n
					)}
					setChoice={handleChoiceChange}
				/>
				{proofsToBumpIsLoading ? (
					<>
						<p>Loading proofs to bump...</p>
					</>
				) : (
					<>
						<p>Bumping overview:</p>
						<p className="text-sm">
							Total proofs to bump: {bumpableProofsCount}
						</p>
						<div className="h-[2px] bg-gray-300 w-full"></div>
						<BumpResult
							proofs={proofsBumpingResult}
							minMaxFee={getMinBumpValue(
								BigInt(proofsToBump[0]?.submitted_max_fee || 0n)
							)}
						/>
					</>
				)}
				<Button
					variant="accent-fill"
					onClick={handleConfirm}
					disabled={
						proofsToBumpIsLoading ||
						isLoading ||
						estimating ||
						!proofsBumpingResult.length ||
						!hasPendingBump ||
						(choice === "custom" &&
							(!ethStrToWei(customEth) ||
								!isCustomFeeValid(
									customEth,
									BigInt(
										proofsToBump[0]?.submitted_max_fee || 0n
									)
								)))
					}
				>
					{isLoading ? "Loading..." : "Confirm"}
				</Button>
			</div>
		</Modal>
	);
};
