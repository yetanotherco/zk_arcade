import React, { useState } from "react";
import { Button } from "../../components";
import { generateCircomParityProof } from "./GenerateProof";
import { VerificationData } from "../../types/aligned";
import { Address } from "viem";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { gameDataKey, ParityGameState } from "./types";

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
	gameIdx,
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
	gameIdx: number;
}) => {
	const [open, setOpen] = useState(false);
	const [proofVerificationData, setProofVerificationData] =
		useState<VerificationData | null>(null);

	const [proofGenerationFailed, setProofGenerationFailed] = useState(false);

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
			const submitproofVerificationData = await generateCircomParityProof({
				user_address,
				userPositions: userGameData.userPositions,
				levelsBoards: userGameData.levelsBoards,
			});

			setProofVerificationData(submitproofVerificationData);
			setOpen(true);
		} catch (e) {
			console.error("Error generating proof:", e);
			setProofGenerationFailed(true);
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

					<div className="w-full max-w-[500px] space-y-2">
						{currentLevel === 0 && (
							<div className="bg-red/20 text-red border border-red text-center p-2 rounded">
								You haven’t completed any levels yet. There’s
								nothing to generate.
							</div>
						)}

						{alreadySubmittedUpToOrBeyond && !hasSubmittedThree && (
							<div className="bg-red/20 text-red border border-red text-center p-2 rounded">
								You have already submitted a proof up to level{" "}
								{submittedLevelOnChain} on-chain. Complete at
								least one more level before submitting again.
							</div>
						)}

						{currentLevel > 0 &&
							currentLevel < 3 &&
							!alreadySubmittedUpToOrBeyond &&
							!hasSubmittedThree && (
								<div className="bg-yellow/20 text-yellow border border-yellow text-center p-2 rounded">
									The full game wasn’t completed — you are
									missing {3 - currentLevel}{" "}
									{3 - currentLevel === 1
										? "level"
										: "levels"}
									. If you submit a proof now, you’ll need to
									prove the remaining levels later.
								</div>
							)}

						{currentLevel === 3 && !hasSubmittedThree && (
							<div className="bg-accent-100/20 text-accent-100 border border-accent-100 text-center p-2 rounded">
								Great job! You’ve completed the game — generate
								and submit your proof now.
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
				</div>
			</div>

			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				userBeastSubmissions={[]}
				proofToSubmitData={proofVerificationData}
				gameName="parity"
				nft_contract_address={nft_contract_address}
				gameIdx={gameIdx}
			/>
		</div>
	);
};
