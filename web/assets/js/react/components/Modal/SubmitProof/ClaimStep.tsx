import React, { useEffect, useRef } from "react";
import { Button } from "../../Button";
import { ProofSubmission } from "../../../types/aligned";
import { useBeastLeaderboardContract } from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { useCSRFToken } from "../../../hooks/useCSRFToken";
import { useParityLeaderboardContract } from "../../../hooks/useParityLeaderboardContract";
import { useChainId, useReadContract } from "wagmi";
import { leaderboardAbi } from "../../../constants/aligned";
import { SocialLinks } from "../../SocialLinks";

type ClaimComponentProps = {
	gameHasExpired: boolean;
	proofSubmission: ProofSubmission;
	proofStatus: ProofSubmission["status"];
	handleClaim: () => void;
	onCancel: () => void;
	isLoading: boolean;
	claimTxHash: string;
	claimExpiryLabel?: string | null;
	claimExpiryUtc?: string | null;
	pointsToClaimConstantMultiplication: number;
};

const ClaimComponent = React.forwardRef<HTMLFormElement, ClaimComponentProps>(
	(
		{
			gameHasExpired,
			proofStatus,
			proofSubmission,
			handleClaim,
			onCancel,
			isLoading,
			claimTxHash,
			claimExpiryLabel,
			claimExpiryUtc,
			pointsToClaimConstantMultiplication,
		},
		formRef
	) => {
		const { csrfToken } = useCSRFToken();
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
				{gameHasExpired && (
					<p className="bg-red/20 rounded p-2 text-red">
						Claim window expired. You can't claim these points
						anymore.
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

				{!canClaim && !gameHasExpired && proofStatus !== "claimed" && (
					<div className="rounded border border-contrast-100/40 bg-black/60 px-4 py-3">
						<p className="text-sm text-text-200 text-center mb-2">
							We're still verifying your proof. Stay tuned on our
							channels for the latest status updates.
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
					<Button
						variant="accent-fill"
						onClick={handleClaim}
						isLoading={isLoading}
						disabled={gameHasExpired && proofStatus !== "claimed"}
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
