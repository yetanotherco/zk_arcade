import React, { useEffect, useRef, useState } from "react";
import {
	NoncedVerificationdata,
	ProofSubmission,
	SubmitProof,
} from "../../types/aligned";
import { Button } from "../../components";
import { useCSRFToken } from "../../hooks/useCSRFToken";
import { Address } from "../../types/blockchain";
import { useAligned, useLeaderboardContract } from "../../hooks";
import { toHex } from "viem";
import { fetchProofVerificationData } from "../../utils/aligned";
import { Modal } from "../../components/Modal";
import { useToast } from "../../state/toast";

const actionBtn: { [key in ProofSubmission["status"]]: string } = {
	claimed: "Share",
	submitted: "Submit solution",
	pending: "None",
	failed: "None",
	underpriced: "Bump fee",
};

type Props = {
	proof: ProofSubmission;
	user_address: Address;
	payment_service_address: Address;
	leaderboard_address: Address;
};

type BumpChoice = "instant" | "default" | "custom";

export const ProofEntryActionBtn = ({
	proof,
	user_address,
	leaderboard_address,
	payment_service_address,
}: Props) => {
	const { csrfToken } = useCSRFToken();
	const formRetryRef = useRef<HTMLFormElement>(null);
	const formSubmittedRef = useRef<HTMLFormElement>(null);
	const [submitProofMessage, setSubmitProofMessage] = useState("");
	const [submitProofMessageLoading, setSubmitProofMessageLoading] =
		useState(false);

  const { addToast } = useToast();
	const { submitSolution } = useLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

	const { estimateMaxFeeForBatchOfProofs, signVerificationData } =
		useAligned();

	const [bumpOpen, setBumpOpen] = useState(false);
	const [bumpLoading, setBumpLoading] = useState(false);
	const [choice, setChoice] = useState<BumpChoice>("default");
	const [customGwei, setCustomGwei] = useState<string>("");

	const [defaultFeeWei, setDefaultFeeWei] = useState<bigint | null>(null);
	const [instantFeeWei, setInstantFeeWei] = useState<bigint | null>(null);

	const toWeiFromGwei = (gweiStr: string): bigint | null => {
		if (!gweiStr.trim()) return null;
		const n = Number(gweiStr);
		if (!isFinite(n) || n <= 0) return null;
		return BigInt(Math.floor(n * 1e9));
	};
	const toGwei = (wei: bigint) => Number(wei) / 1e9;

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formSubmittedRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const handleBtnClick = async () => {
		if (proof.status === "failed") {
			// nothing to do
			return;
		}

		if (proof.status === "claimed") {
			const text = encodeURIComponent(
				"🟩 I just claimed my points on zk-arcade!\n\n"
			);
			const url = encodeURIComponent("Try: https://zkarcade.com\n\n");
			const hashtags = `\naligned,proof,${proof.proving_system}`;
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

			window.open(twitterShareUrl, "_blank");

			return;
		}

		if (proof.status === "submitted") {
			if (!proof.batch_hash) {
				addToast({
				title: "Batch not available",
				desc: "Batch data not available for this proof",
				type: "error",
				});
				return;
			}

			await submitSolution.submitBeastSolution(proof);
			return;
		}

    	if (proof.status === "underpriced") {
			try {
				setBumpLoading(true);
				const est = await estimateMaxFeeForBatchOfProofs(16);
				if (!est) {
					addToast({
						title: "Could not estimate the fee",
						desc: "Please try again in a few seconds.",
						type: "error",
					});
					setBumpLoading(false);
					return;
				}
				setDefaultFeeWei(est);
				setInstantFeeWei((est * 125n) / 100n); // 1.25x
				setChoice("default");
				setCustomGwei("");
				setBumpOpen(true);
			} catch {
				addToast({
					title: "Could not estimate the fee",
					desc: "Please try again in a few seconds.",
					type: "error",
				});
			} finally {
				setBumpLoading(false);
			}
			}
		};

  	const handleConfirmBump = async () => {
    	try {
      		setSubmitProofMessageLoading(true);

			const res = await fetchProofVerificationData(proof.id);
			if (!res) {
				addToast({
					title: "There was a problem while sending the proof",
					desc: "Please try again.",
					type: "error",
				});
				setSubmitProofMessageLoading(false);
				return;
			}
      		const noncedVerificationData: NoncedVerificationdata = res.verification_data;

			let chosenWei: bigint | null = null;
			if (choice === "default") chosenWei = defaultFeeWei;
			else if (choice === "instant") chosenWei = instantFeeWei;
			else if (choice === "custom") chosenWei = toWeiFromGwei(customGwei);

			if (!chosenWei || chosenWei <= 0n) {
				addToast({
				title: "Invalid fee",
				desc: "Please enter a value greater than 0 Gwei.",
				type: "error",
				});
				setSubmitProofMessageLoading(false);
				return;
			}

      		noncedVerificationData.maxFee = toHex(chosenWei, { size: 32 });

			const { r, s, v } = await signVerificationData(
				noncedVerificationData,
				payment_service_address
			);

				const submitProofMessage: SubmitProof = {
					verificationData: noncedVerificationData,
					signature: {
						r,
						s,
						v: Number(v),
					},
				};

				setSubmitProofMessage(JSON.stringify(submitProofMessage));

				addToast({
					title: "Retrying submission",
					desc: "Using the newly selected fee...",
					type: "success",
				});

				setBumpOpen(false);
				window.setTimeout(() => {
					formRetryRef.current?.submit();
				}, 1000);
			} catch {
				addToast({
					title: "Could not apply the bump",
					desc: "Please try again in a few seconds.",
					type: "error",
				});
				setSubmitProofMessageLoading(false);
		}
	};

	return (
    	<td>
    		<div className="relative group/proof-history-item w-full">
        	<Button
				variant="contrast"
				className="text-nowrap text-sm w-full"
				disabled={proof.status === "failed" || proof.status === "pending"}
          		style={{ paddingLeft: 0, paddingRight: 0, paddingTop: 8, paddingBottom: 8 }}
				onClick={handleBtnClick}
				isLoading={
					submitSolution.submitSolutionFetchingVDataIsLoading ||
					submitSolution.receipt.isLoading ||
					submitProofMessageLoading ||
					bumpLoading
				}
				>
					{actionBtn[proof.status]}
				</Button>
			</div>

			{proof.status === "underpriced" && (
				<form
					ref={formRetryRef}
					action="/proof/status/retry"
					method="post"
					className="hidden"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input
						type="hidden"
						name="submit_proof_message"
						value={submitProofMessage}
					/>
					<input type="hidden" name="proof_id" value={proof.id} />
				</form>
			)}
			{proof.status === "submitted" && (
				<form
					className="hidden"
					ref={formSubmittedRef}
					action="/proof/status/submitted"
					method="POST"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input type="hidden" name="proof_id" value={proof.id} />
				</form>
			)}

			<Modal
				open={bumpOpen}
				setOpen={setBumpOpen}
				maxWidth={520}
				shouldCloseOnEsc
				shouldCloseOnOutsideClick
			>
				<div className="rounded-2xl bg-background p-6 text-white">
				<h3 className="text-xl font-semibold mb-4">Bump Fee</h3>
				<p className="text-sm opacity-80 mb-4">
					Elegí cuánto querés aumentar la comisión para reintentar tu proof.
				</p>

				<div className="flex flex-col gap-3">
					<label className={`cursor-pointer rounded-xl border p-3 ${choice === "instant" ? "border-accent-100" : "border-contrast-100/40"}`}>
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
					<p className="mt-1 text-xs opacity-70">Fee más alta (confirmación más rápida).</p>
					</label>

					<label className={`cursor-pointer rounded-xl border p-3 ${choice === "default" ? "border-accent-100" : "border-contrast-100/40"}`}>
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
					<p className="mt-1 text-xs opacity-70">Fee recomendada.</p>
					</label>

					<div className={`rounded-xl border p-3 ${choice === "custom" ? "border-accent-100" : "border-contrast-100/40"}`}>
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
						placeholder="Ingresá la fee en Gwei"
						className="w-full rounded-lg bg-contrast-100/10 px-3 py-2 outline-none"
						value={customGwei}
						onChange={(e) => {
							setChoice("custom");
							setCustomGwei(e.target.value);
						}}
						/>
						<span className="text-sm opacity-80">Gwei</span>
					</div>
					<p className="mt-1 text-xs opacity-70">Definí tu propia max fee.</p>
					</div>
				</div>

				<div className="mt-6 flex justify-end gap-3">
					<Button variant="contrast" onClick={() => setBumpOpen(false)}>
					Cancel
					</Button>
					<Button
					variant="accent-fill"
					onClick={handleConfirmBump}
					isLoading={submitProofMessageLoading}
					disabled={
						submitProofMessageLoading ||
						(choice === "custom" && !toWeiFromGwei(customGwei))
					}
					>
					Confirm
					</Button>
				</div>
				</div>
			</Modal>
		</td>
	);
};
