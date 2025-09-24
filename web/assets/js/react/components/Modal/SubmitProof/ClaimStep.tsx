import React, { useEffect, useRef } from "react";
import { Button } from "../../Button";
import { ProofSubmission } from "../../../types/aligned";
import { useBeastLeaderboardContract } from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { useCSRFToken } from "../../../hooks/useCSRFToken";
import { useParityLeaderboardContract } from "../../../hooks/useParityLeaderboardContract";
import { useChainId, useReadContract } from "wagmi";
import { leaderboardAbi } from "../../../constants/aligned";

type ClaimComponentProps = {
	gameHasExpired: boolean;
	proofSubmission: ProofSubmission;
	handleClaim: () => void;
	onCancel: () => void;
	isLoading: boolean;
	claimTxHash: string;
};

const ClaimComponent = React.forwardRef<HTMLFormElement, ClaimComponentProps>(
	(
		{
			gameHasExpired,
			proofSubmission,
			handleClaim,
			onCancel,
			isLoading,
			claimTxHash,
		},
		formRef
	) => {
		const { csrfToken } = useCSRFToken();
		const proofStatus = proofSubmission.status;
		return (
			<div className="flex flex-col gap-4 justify-between h-full">
				{gameHasExpired && proofStatus === "verified" && (
					<p className="bg-red/20 rounded p-2 text-red">
						The game has expired. You didn't claim the points in
						time, try again.
					</p>
				)}
				{!gameHasExpired && proofStatus === "verified" && (
					<p className="bg-accent-100/20 rounded p-2 text-accent-100">
						The proof was verified and it is ready to claim the
						points.
					</p>
				)}
				{proofStatus === "claimed" && (
					<p className="bg-blue/20 rounded p-2 text-blue">
						Your points have been claimed successfully
					</p>
				)}
				<div className="flex flex-col gap-2">
					<p>Game: {proofSubmission.game}</p>
					<p>Daily Quest: {Number(proofSubmission.game_idx) + 1}</p>
					<p>Level reached: {proofSubmission.level_reached}</p>
					<p>Points to claim: {proofSubmission.level_reached}</p>
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
	user_address: Address;
	leaderboard_address: Address;
};

const BeastClaim = ({
	leaderboard_address,
	user_address,
	proofSubmission,
	setOpen,
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
				"🟩 I just claimed my points on zk-arcade!\n\n"
			);
			const url = encodeURIComponent("Try: https://zkarcade.com\n\n");
			const hashtags = `\naligned,proof,${proofSubmission.proving_system}`;
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

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
			proofSubmission={proofSubmission}
			ref={formRef}
			claimTxHash={claimTxHash}
		/>
	);
};

const ParityClaim = ({
	user_address,
	leaderboard_address,
	proofSubmission,
	setOpen,
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
				"🟩 I just claimed my points on zk-arcade!\n\n"
			);
			const url = encodeURIComponent("Try: https://zkarcade.com\n\n");
			const hashtags = `\naligned,proof,${proofSubmission.proving_system}`;
			const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

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
			ref={formRef}
			claimTxHash={submitSolution.tx.hash || ""}
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
