import React, { useState } from "react";
import { Button } from "../../components";
import { generateCircomParityProof } from "./GenerateProof";
import { VerificationData } from "../../types/aligned";
import { Address, toHex } from "viem";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { gameDataKey, ParityGameState } from "./types";
import { useCSRFToken } from "../../hooks/useCSRFToken";

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

type TimeRemaining = {
	hours: number;
	minutes: number;
};

export const ProveAndSubmit = ({
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
	currentGameConfig,
	setGameState,
	submittedLevelOnChain,
	timeRemaining,
	nft_contract_address,
	public_nft_contract_address,
	gameIdx,
	highestLevelReached,
	highestLevelReachedProofId,
	setPlayerLevelReached,
}: {
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	currentGameConfig: string;
	setGameState: (state: ParityGameState) => void;
	submittedLevelOnChain: number;
	timeRemaining?: TimeRemaining | null;
	nft_contract_address: Address;
	public_nft_contract_address: Address;
	gameIdx: number;
	highestLevelReached: number;
	highestLevelReachedProofId?: string | number;
	setPlayerLevelReached: (level: number) => void;
}) => {
	const [open, setOpen] = useState(false);
	const [proofVerificationData, setProofVerificationData] =
		useState<VerificationData | null>(null);

	const [proofGenerationFailed, setProofGenerationFailed] = useState(false);
	const [isGeneratingProof, setIsGeneratingProof] = useState(false);

	const { csrfToken } = useCSRFToken();

	const [userGameData, _setUserGameData] = useState<GameStatus>(() => {
		const stored = localStorage.getItem("parity-game-data");
		const gameData: { [key: string]: GameStatus } = stored
			? JSON.parse(stored)
			: {};
		const key = gameDataKey(currentGameConfig, user_address);
		return (
			gameData[key] || {
				levelsBoards: [],
				userPositions: [],
			}
		);
	});

	const generateproofVerificationData = async () => {
		try {
			setIsGeneratingProof(true);
			const submitproofVerificationData = await generateCircomParityProof(
				{
					user_address,
					userPositions: userGameData.userPositions,
					levelsBoards: userGameData.levelsBoards,
				}
			);

			setProofVerificationData(submitproofVerificationData);

			// If the user already has a submitted proof for this level, open
			// the existing proof instead of showing the modal for the newly
			// generated proof (avoids flashing the generated-proof modal).
			setIsGeneratingProof(false);

			if (
				highestLevelReached === currentLevel &&
				highestLevelReachedProofId
			) {
				try {
					const url = `${window.location.pathname}?submitProofId=${highestLevelReachedProofId}`;
					window.history.pushState({}, "", url);
					window.location.reload();
					return;
				} catch (e) {
					console.warn("Failed to open existing proof by id:", e);
				}
			}

			setOpen(true);
		} catch (e) {
			console.error("Error generating proof:", e);

			// send the error to telemetry so we can reproduce it
			try {
				const stored = localStorage.getItem("parity-game-data");
				const key = gameDataKey(currentGameConfig, user_address);
				const gameData: { [key: string]: GameStatus } = stored
					? JSON.parse(stored)
					: {};

				await fetch("/api/telemetry/error", {
					method: "POST",
					credentials: "include",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						_csrf_token: csrfToken,
						name: "Parity proof generation",
						message:
							"An error occurred while generating parity proof",
						details: {
							error: e,
							gameConfig: toHex(BigInt(currentGameConfig), {
								size: 32,
							}),
							gameTrace: gameData[key],
						},
					}),
				});
			} catch (err) {}

			setIsGeneratingProof(false);
			setProofGenerationFailed(true);

			// Delete the probably invalid levels from local storage (those that
			// haven't been submitted on-chain yet)
			const stored = localStorage.getItem("parity-game-data");
			const gameData: { [key: string]: GameStatus } = stored
				? JSON.parse(stored)
				: {};
			const key = gameDataKey(currentGameConfig, user_address);
			if (gameData[key]) {
				for (let i = submittedLevelOnChain + 1; i <= 3; i++) {
					gameData[key].levelsBoards.pop();
					gameData[key].userPositions.pop();
				}
				localStorage.setItem(
					"parity-game-data",
					JSON.stringify(gameData)
				);
			}

			// Restore the level reached by the user to the last one submitted on-chain
			setPlayerLevelReached(submittedLevelOnChain + 1);
		}
	};

	const currentLevel = userGameData.levelsBoards.length;

	const alreadySubmittedUpToOrBeyond =
		currentLevel > 0 && submittedLevelOnChain >= currentLevel;
	const hasSubmittedThree = submittedLevelOnChain === 3;

	const disableGenerate =
		currentLevel === 0 || alreadySubmittedUpToOrBeyond || hasSubmittedThree;

	if (currentLevel === 3 && hasSubmittedThree) {
		return (
			<div className="w-full h-full flex flex-col gap-10 justify-center items-center">
				<div>
					<h2 className="text-2xl mb-2 font-normal text-center">
						Game completed
					</h2>
					<p className="text-text-200 text-center">
						You have completed the full game, come in{" "}
						<span className="text-accent-100">
							{timeRemaining ? (
								<span className="text-accent-100">
									{timeRemaining.hours > 0
										? `${timeRemaining.hours} hours`
										: `${timeRemaining.minutes} minutes`}
								</span>
							) : (
								<span className="text-accent-100">
									loading...
								</span>
							)}
						</span>{" "}
						for new levels!
					</p>
				</div>
				<Button
					variant="arcade"
					className="w-full max-w-[300px]"
					onClick={() => {
						setGameState("home");
					}}
				>
					Home
				</Button>
			</div>
		);
	}

	const proofGenerationErrorView: JSX.Element = (
		<>
			<div className="bg-red/20 text-red border border-red text-center p-2 rounded mb-2 max-w-[500px]">
				There was an error generating your proof. Please try playing and
				generating your proof again.
			</div>

			<div className="flex flex-col gap-5 w-full max-w-[300px]">
				<Button
					variant="arcade"
					className="w-full"
					onClick={() => {
						setGameState("home");
					}}
				>
					Home
				</Button>
			</div>
		</>
	);

	return (
		<div>
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Prove your playthrough
						</h2>
						<p className="text-text-200 text-center">
							{currentLevel
								? `Prove you have completed up to level ${currentLevel}`
								: `No levels completed yet`}
						</p>
					</div>

					{proofGenerationFailed ? (
						proofGenerationErrorView
					) : (
						<>
							<div className="w-full max-w-[500px] space-y-2">
								{currentLevel === 0 && (
									<div className="bg-red/20 text-red border border-red text-center p-2 rounded">
										You haven’t completed any levels yet.
										There’s nothing to generate.
									</div>
								)}

								{alreadySubmittedUpToOrBeyond &&
									!hasSubmittedThree && (
										<div className="bg-red/20 text-red border border-red text-center p-2 rounded">
											You have already submitted a proof
											up to level {submittedLevelOnChain}{" "}
											on-chain. Complete at least one more
											level before submitting again.
										</div>
									)}

								{currentLevel > 0 &&
									currentLevel < 3 &&
									!alreadySubmittedUpToOrBeyond &&
									!hasSubmittedThree && (
										<div className="bg-yellow/20 text-yellow border border-yellow text-center p-2 rounded">
											The full game wasn’t completed — you
											are missing {3 - currentLevel}{" "}
											{3 - currentLevel === 1
												? "level"
												: "levels"}
											. If you submit a proof now, you’ll
											need to prove the remaining levels
											later.
										</div>
									)}

								{currentLevel === 3 && !hasSubmittedThree && (
									<div className="bg-accent-100/20 text-accent-100 border border-accent-100 text-center p-2 rounded">
										Great job! You’ve completed the game —
										generate and submit your proof now.
									</div>
								)}
								{currentLevel < 3 && hasSubmittedThree && (
									<div className="bg-red/20 text-red border border-red text-center p-2 rounded">
										You have already submitted a proof for
										the full game. You can’t submit proofs
										for the previous levels.
									</div>
								)}
							</div>

							<div className="flex flex-col gap-5 w-full max-w-[300px]">
								<Button
									variant="arcade"
									className="w-full"
									onClick={() => {
										generateproofVerificationData();
									}}
									isLoading={isGeneratingProof}
									disabled={disableGenerate}
								>
									Generate Proof
								</Button>
								<Button
									variant="arcade"
									className="w-full"
									onClick={() => {
										setGameState("home");
									}}
								>
									Home
								</Button>
							</div>
						</>
					)}
				</div>
			</div>

			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				proofToSubmitData={proofVerificationData}
				gameName="parity"
				nft_contract_address={nft_contract_address}
				public_nft_contract_address={public_nft_contract_address}
				gameIdx={gameIdx}
				highestLevelReached={highestLevelReached}
				highestLevelReachedProofId={highestLevelReachedProofId}
				currentLevelReached={currentLevel}
			/>
		</div>
	);
};
