import React, { useEffect, useRef, useState } from "react";
import { Button } from "../../Button";
import { ProofSubmission } from "../../../types/aligned";
import { useBeastLeaderboardContract } from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { useCSRFToken } from "../../../hooks/useCSRFToken";
import { useParityLeaderboardContract } from "../../../hooks/useParityLeaderboardContract";
import { useChainId, useReadContract } from "wagmi";
import { leaderboardAbi } from "../../../constants/aligned";
import { SocialLinks } from "../../SocialLinks";
import { Modal } from "..";

type ClaimComponentProps = {
	gameHasExpired: boolean;
	proofSubmission: ProofSubmission;
	proofStatus: ProofSubmission["status"];
	handleClaim: () => void;
	beforeInvalidating?: () => void;
	onCancel: () => void;
	isLoading: boolean;
	claimTxHash: string;
	claimExpiryLabel?: string | null;
	claimExpiryUtc?: string | null;
	pointsToClaimConstantMultiplication: number;
	contractCallIsLoading: boolean;
};

const ClaimComponent = React.forwardRef<HTMLFormElement, ClaimComponentProps>(
	(
		{
			gameHasExpired,
			proofStatus,
			proofSubmission,
			handleClaim,
			beforeInvalidating,
			onCancel,
			isLoading,
			claimTxHash,
			claimExpiryLabel,
			claimExpiryUtc,
			pointsToClaimConstantMultiplication,
			contractCallIsLoading,
		},
		formRef
	) => {
		const { csrfToken } = useCSRFToken();
		const [isInvalidating, setIsInvalidating] = useState(false);
		const [showInvalidateConfirm, setShowInvalidateConfirm] =
			useState(false);
		const invalidateFormRef = useRef<HTMLFormElement>(null);
		const handleInvalidate = () => {
			if (isInvalidating) return;
			setIsInvalidating(true);
			beforeInvalidating && beforeInvalidating();
			invalidateFormRef.current?.submit();
		};
		const showExpiryInfo =
			!gameHasExpired &&
			proofStatus === "verified" &&
			claimExpiryLabel &&
			claimExpiryUtc;

		const canClaim = !gameHasExpired && proofStatus === "verified";

		return (
			<div className="flex flex-col gap-4 justify-between h-full">
				{canClaim && (
					<p className="bg-accent-100/20 rounded p-2 text-accent-100">
						Your proof was verified using Aligned. You can now claim
						your points—this will cost gas and initiate a
						transaction from your wallet.
					</p>
				)}
				{gameHasExpired && !contractCallIsLoading && (
					<p className="bg-red/20 rounded p-2 text-red">
						Claim window expired. You can't claim these points
						anymore.
					</p>
				)}
				{proofStatus === "invalidated" && (
					<p className="bg-red/20 rounded p-2 text-red">
						This proof was invalidated. Generate a new proof to
						claim.
					</p>
				)}
				{contractCallIsLoading && (
					<p className="bg-contrast-200 rounded p-2 text-text-200">
						Loading claim information. Please wait...
					</p>
				)}
				{showExpiryInfo && (
					<div className="rounded border border-accent-100/25 bg-black/60 px-4 py-3 text-sm text-text-200">
						Claim expires in{" "}
						<span className="font-semibold text-accent-100">
							{claimExpiryLabel}
						</span>
						<div className="mt-1 text-xs text-text-300">
							UTC {claimExpiryUtc}
						</div>
					</div>
				)}

				{!canClaim &&
					!gameHasExpired &&
					proofStatus !== "claimed" &&
					proofStatus !== "invalidated" && (
						<div className="rounded border border-contrast-100/40 bg-black/60 px-4 py-3">
							<p className="text-sm text-text-200 text-center mb-2">
								We're still verifying your proof. Stay tuned on
								our channels for the latest status updates.
							</p>
						</div>
					)}
				<SocialLinks className="text-xs text-text-300" />

				<div className="flex flex-col gap-2">
					<p>Game: {proofSubmission.game}</p>
					<p>Quest number: {Number(proofSubmission.game_idx) + 1}</p>
					<p>Level reached: {proofSubmission.level_reached}</p>
					<p>
						Points to claim:{" "}
						{proofSubmission.level_reached *
							pointsToClaimConstantMultiplication}
					</p>
					<p>Prover: {proofSubmission.proving_system}</p>
				</div>
				<a
					href="/leaderboard"
					className="mb-2 text-blue text-md hover:underline text-center"
				>
					Go to leaderboard
				</a>
				<div className="self-end">
					<Button variant="text" className="mr-10" onClick={onCancel}>
						Cancel
					</Button>
					{proofStatus === "verified" && (
						<div className="relative inline-flex items-center mr-10 group">
							<Button
								variant="text"
								className="text-red hover:underline transition-colors flex items-center gap-1"
								isLoading={isInvalidating}
								disabled={isInvalidating}
								onClick={() => setShowInvalidateConfirm(true)}
							>
								Invalidate
							</Button>
							<div className="pointer-events-none group-hover:pointer-events-auto absolute bottom-full right-0 group-focus-within:pointer-events-auto pb-2">
								<div className="px-3 py-2 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 shadow-lg ring-1 ring-white/10 min-w-[280px] max-w-[360px]">
									<p>
										If your claim is stuck or failing,
										invalidate to regenerate a new proof.{" "}
										<span
											className="text-accent-100 cursor-pointer hover:underline"
											onClick={() =>
												(window.location.href = "/#faq")
											}
										>
											Help
										</span>
									</p>
								</div>
							</div>
						</div>
					)}
					<Button
						variant="accent-fill"
						onClick={handleClaim}
						isLoading={isLoading}
						disabled={
							(gameHasExpired && proofStatus !== "claimed") ||
							proofStatus === "invalidated"
						}
					>
						{proofStatus === "claimed"
							? "Share on twitter"
							: "Claim"}
					</Button>
				</div>
				<form
					className="hidden"
					ref={formRef}
					action="/proof/status/submitted"
					method="POST"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
					<input
						type="hidden"
						name="proof_id"
						value={proofSubmission.id}
					/>
					<input
						type="hidden"
						name="claim_tx_hash"
						value={claimTxHash}
					/>
				</form>
				<form
					className="hidden"
					ref={invalidateFormRef}
					action={`/proof/invalidate/${encodeURIComponent(
						String(proofSubmission.id)
					)}`}
					method="POST"
				>
					<input type="hidden" name="_csrf_token" value={csrfToken} />
				</form>

				<Modal
					open={showInvalidateConfirm}
					setOpen={setShowInvalidateConfirm}
					maxWidth={520}
				>
					<div className="bg-contrast-100 w-full p-6 rounded">
						<h3 className="text-xl mb-4 text-center">
							Are you sure?
						</h3>
						<p className="text-text-200 mb-6">
							Invalidating will discard the current proof and
							clear local game data for this game so you can
							regenerate a fresh proof.
						</p>
						<div className="flex justify-end gap-3">
							<Button
								variant="text"
								onClick={() => setShowInvalidateConfirm(false)}
							>
								Cancel
							</Button>
							<Button
								variant="accent-fill"
								isLoading={isInvalidating}
								disabled={isInvalidating}
								onClick={() => {
									setShowInvalidateConfirm(false);
									handleInvalidate();
								}}
							>
								Yes
							</Button>
						</div>
					</div>
				</Modal>
			</div>
		);
	}
);

type ClaimProps = {
	setOpen: (prev: boolean) => void;
	proofSubmission: ProofSubmission;
	proofStatus?: ProofSubmission["status"];
	user_address: Address;
	leaderboard_address: Address;
	claimExpiryLabel?: string | null;
	claimExpiryUtc?: string | null;
};

const BeastClaim = ({
	leaderboard_address,
	user_address,
	proofSubmission,
	proofStatus,
	setOpen,
	claimExpiryLabel,
	claimExpiryUtc,
}: ClaimProps) => {
	const chainId = useChainId();
	const { submitSolution } = useBeastLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
	});

	const claimGame = useReadContract({
		address: leaderboard_address,
		abi: leaderboardAbi,
		functionName: "beastGames",
		args: [proofSubmission.game_idx],
		chainId,
	});

	const formRef = useRef<HTMLFormElement>(null);

	const handleClaim = async () => {
		if (proofSubmission.status === "claimed") {
			const text = encodeURIComponent(
				"I just claimed my points on ZK Arcade. Think you can beat my score? Follow @alignedlayer, play, and prove it"
			);
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}`;

			window.open(twitterShareUrl, "_blank");

			return;
		}

		await submitSolution.claimBeastPoints(proofSubmission);
	};

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const gameHasExpired =
		Number(claimGame.data?.endsAtTime || 0n) < Date.now() / 1000;

	const claimTxHash = submitSolution.tx.hash || "";

	return (
		<ClaimComponent
			gameHasExpired={gameHasExpired}
			handleClaim={handleClaim}
			isLoading={submitSolution.isLoading}
			onCancel={() => setOpen(false)}
			proofStatus={proofStatus}
			proofSubmission={proofSubmission}
			ref={formRef}
			claimTxHash={claimTxHash}
			claimExpiryLabel={claimExpiryLabel}
			claimExpiryUtc={claimExpiryUtc}
			pointsToClaimConstantMultiplication={60000}
			contractCallIsLoading={claimGame.isLoading}
		/>
	);
};

const ParityClaim = ({
	user_address,
	leaderboard_address,
	proofSubmission,
	proofStatus,
	setOpen,
	claimExpiryLabel,
	claimExpiryUtc,
}: ClaimProps) => {
	const chainId = useChainId();

	const { submitSolution } = useParityLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const claimGame = useReadContract({
		address: leaderboard_address,
		abi: leaderboardAbi,
		functionName: "parityGames",
		args: [proofSubmission.game_idx],
		chainId,
	});

	const formRef = useRef<HTMLFormElement>(null);

	const handleClaim = async () => {
		if (proofSubmission.status === "claimed") {
			const text = encodeURIComponent(
				"I just claimed my points on ZK Arcade. Think you can beat my score? Follow @alignedlayer, play, and prove it"
			);
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}`;

			window.open(twitterShareUrl, "_blank");

			return;
		}

		await submitSolution.claimParityPoints(proofSubmission);
	};

	// clean parity
	const beforeInvalidating = () => {
		localStorage.setItem("parity-game-data", "{}");
	};

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const gameHasExpired =
		Number(claimGame.data?.endsAtTime || 0n) < Date.now() / 1000;

	return (
		<ClaimComponent
			gameHasExpired={gameHasExpired}
			handleClaim={handleClaim}
			isLoading={submitSolution.isLoading}
			onCancel={() => setOpen(false)}
			proofSubmission={proofSubmission}
			proofStatus={proofStatus}
			ref={formRef}
			claimTxHash={submitSolution.tx.hash || ""}
			claimExpiryLabel={claimExpiryLabel}
			claimExpiryUtc={claimExpiryUtc}
			pointsToClaimConstantMultiplication={28000}
			contractCallIsLoading={claimGame.isLoading}
			beforeInvalidating={beforeInvalidating}
		/>
	);
};

export const ClaimStep = (props: ClaimProps) => {
	if (props.proofSubmission.game === "Beast") {
		return <BeastClaim {...props} />;
	}

	if (props.proofSubmission.game === "Parity") {
		return <ParityClaim {...props} />;
	}
};
