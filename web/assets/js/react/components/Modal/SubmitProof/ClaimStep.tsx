import React, { useEffect, useRef } from "react";
import { Button } from "../../Button";
import { ProofSubmission } from "../../../types/aligned";
import { useBeastLeaderboardContract } from "../../../hooks";
import { Address } from "../../../types/blockchain";
import { useCSRFToken } from "../../../hooks/useCSRFToken";
import { useParityLeaderboardContract } from "../../../hooks/useParityLeaderboardContract";

type ClaimComponentProps = {
	gameHasExpired: boolean;
	proofSubmission: ProofSubmission;
	handleClaim: () => void;
	onCancel: () => void;
	isLoading: boolean;
};

const ClaimComponent = React.forwardRef<HTMLFormElement, ClaimComponentProps>(
	(
		{ gameHasExpired, proofSubmission, handleClaim, onCancel, isLoading },
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
					<p>Prover: {proofSubmission.proving_system}</p>
					<p>Game: {proofSubmission.game}</p>
					<p>Level reached: {proofSubmission.level_reached}</p>
					<p>Points to claim: {proofSubmission.level_reached}</p>
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
	const { submitSolution, currentGame } = useBeastLeaderboardContract({
		userAddress: user_address,
		contractAddress: leaderboard_address,
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

		await submitSolution.submitBeastSolution(proofSubmission);
	};

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const submittedGameConfigBigInt = BigInt(
		"0x" + proofSubmission.game_config
	);
	const currentGameConfigBigInt = BigInt(currentGame.game?.gameConfig || 0n);

	const gameHasExpired =
		submittedGameConfigBigInt !== currentGameConfigBigInt;

	return (
		<ClaimComponent
			gameHasExpired={gameHasExpired}
			handleClaim={handleClaim}
			isLoading={false}
			onCancel={() => setOpen(false)}
			proofSubmission={proofSubmission}
			ref={formRef}
		/>
	);
};

function readLeftmost(value, level) {
	const bitsToKeep = level * 80;
	const totalBits = 256;

	if (bitsToKeep > totalBits) throw new Error("Too many bits requested");

	const shiftAmount = totalBits - bitsToKeep;

	return value >> BigInt(shiftAmount);
}

const ParityClaim = ({
	user_address,
	leaderboard_address,
	proofSubmission,
	setOpen,
}: ClaimProps) => {
	const { currentGame, submitSolution } = useParityLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
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

		await submitSolution.submitParitySolution(proofSubmission);
	};

	useEffect(() => {
		if (submitSolution.receipt.isSuccess) {
			window.setTimeout(() => {
				formRef.current?.submit();
			}, 1000);
		}
	}, [submitSolution.receipt]);

	const currentGameConfigBigInt = readLeftmost(
		currentGame.game?.gameConfig || 0n,
		proofSubmission.level_reached
	);

	const submittedGameConfigBigInt = readLeftmost(
		BigInt("0x" + proofSubmission.game_config),
		proofSubmission.level_reached
	);

	const gameHasExpired =
		submittedGameConfigBigInt !== currentGameConfigBigInt;

	return (
		<ClaimComponent
			gameHasExpired={gameHasExpired}
			handleClaim={handleClaim}
			isLoading={false}
			onCancel={() => setOpen(false)}
			proofSubmission={proofSubmission}
			ref={formRef}
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
