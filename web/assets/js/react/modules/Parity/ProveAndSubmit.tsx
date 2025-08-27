import React, { useState } from "react";
import { Button } from "../../components";
import { useSwapTransition } from "./useSwapTransition";
import { generateCircomParityProof } from "./GenerateProof";
import { VerificationData } from "../../types/aligned";
import { Address } from "viem";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { ParityGameState } from "./types";

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const ProveAndSubmit = ({
	goToNextLevel,
	levelBoards,
	userPositions,
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
	setGameState,
	currentGameConfig,
}: {
	goToNextLevel: () => void;
	levelBoards: number[][];
	userPositions: [number, number][];
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	setGameState: (state: ParityGameState) => void;
	currentGameConfig: string;
}) => {
	const [proofVerificationData, setProofVerificationData] = useState<VerificationData | null>(null);
	const [open, setOpen] = useState(false);

	const generateproofVerificationData = async () => {
		const stored = localStorage.getItem("parity-game-data");

		const gameData: { [key: string]: GameStatus } = stored
			? JSON.parse(stored)
			: {};

		const currentLevelReached: GameStatus = gameData[currentGameConfig] || {
			levelsBoards: [],
			userPositions: [],
		};

		currentLevelReached.levelsBoards.push(levelBoards);
		currentLevelReached.userPositions.push(userPositions);

		const submitproofVerificationData = await generateCircomParityProof({
			user_address,
			userPositions: currentLevelReached.userPositions,
			levelsBoards: currentLevelReached.levelsBoards,
		});

		setProofVerificationData(submitproofVerificationData);
		setOpen(true);
	};

	const saveLevelData = () => {
		const stored = localStorage.getItem("parity-game-data");
		const gameData: { [key: string]: GameStatus } = stored
			? JSON.parse(stored)
			: {};

		const currentLevelReached: GameStatus = gameData[currentGameConfig] || {
			levelsBoards: [],
			userPositions: [],
		};

		currentLevelReached.levelsBoards.push(levelBoards);
		currentLevelReached.userPositions.push(userPositions);

		gameData[currentGameConfig] = currentLevelReached;
		localStorage.setItem("parity-game-data", JSON.stringify(gameData));
	};

	const view = useSwapTransition(proofVerificationData, (_, proven) => (
		<div>
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Prove Execution
						</h2>
						<p className="text-text-200 text-center">
							Prove the completion of the level and submit it to
							Aligned to claim points
						</p>
					</div>
					<Button
						variant="arcade"
						className="max-w-[300px] w-full"
						onClick={() => {
							generateproofVerificationData();
						}}
					>
						Generate Proof
					</Button>

					<Button
						variant="arcade"
						className="max-w-[300px] w-full"
						onClick={() => {
							saveLevelData();
							goToNextLevel();
							setGameState("running");
						}}
					>
						Next Level
					</Button>
				</div>
			</div>
		</div>
	));

	return (
		<div>
			{view}
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				userBeastSubmissions={[]}
				proofToSubmitData={proofVerificationData}
				gameName="parity"
			/>
		</div>
	);
};
