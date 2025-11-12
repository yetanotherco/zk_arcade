import React, { ReactNode, useCallback, useEffect, useState } from "react";
import { Button } from "../../components";
import { ParityTutorial } from "./Tutorial";
import { gameDataKey, GameStatus, ParityGameState } from "./types";
import { PlayState } from "./PlayState";
import { AfterLevelCompletion } from "./AfterLevelCompletion";
import { useSwapTransition } from "./useSwapTransition";
import { useParityGames } from "./useParityGames";
import { Address } from "viem";
import { useParityControls } from "./useParityControls";
import { ProveAndSubmit } from "./ProveAndSubmit";

type GameProps = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	leaderboard_address: Address;
	nft_contract_address: Address;
	batcher_url: string;
	highest_level_reached: number;
	highest_level_reached_proof_id?: string | number;
};

export const Game = ({
	payment_service_address,
	user_address,
	leaderboard_address,
	nft_contract_address,
	batcher_url,
	highest_level_reached,
	highest_level_reached_proof_id,
}: GameProps) => {
	const [gameState, setGameState] = useState<ParityGameState>("home");
	const {
		currentLevel,
		levels,
		playerLevelReached,
		setPlayerLevelReached,
		setCurrentLevel,
		currentGameConfig,
		currentGameIdx,
		timeRemaining,
		currentGameLevelCompleted,
		gamesHaveFinished,
		isLoading,
	} = useParityGames({
		leaderBoardContractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const {
		hasWon,
		positionIdx,
		values,
		reset,
		setValues,
		userPositions,
		levelBoards,
		setPosition,
		setHasWon,
		startLevel,
		updatePos,
	} = useParityControls({
		initialPosition:
			currentLevel !== null
				? levels[currentLevel - 1].initialPos
				: { row: 0, col: 0 },
		initialValues:
			currentLevel !== null
				? levels[currentLevel - 1].board
				: [0, 0, 0, 0, 0, 0, 0, 0, 0],
	});

	const [hasPlayedTutorial, setHasPlayedTutorial] = useState(false);

	useEffect(() => {
		if (localStorage.getItem("parity-tutorial-played") === "true")
			setHasPlayedTutorial(true);
	}, []);

	const saveLevelData = useCallback(() => {
		if (currentLevel == null) return;

		const stored = localStorage.getItem("parity-game-data");
		const gameData: Record<string, GameStatus> = stored ? JSON.parse(stored) : {};

		const key = gameDataKey(currentGameConfig, user_address);
		const current: GameStatus = gameData[key] || {
			levelsBoards: [],
			userPositions: [],
		};

		// snapshot deep clones to avoid accidental later mutation
		const snapshotBoards = levelBoards.map(b => b.slice());
		const snapshotPositions = userPositions.map(([c, r]) => [c, r] as [number, number]);

		const idx = currentLevel - 1; // 1-based currentLevel -> 0-based index

		// write deterministically at the exact index and truncate tail
		current.levelsBoards[idx] = snapshotBoards;
		current.userPositions[idx] = snapshotPositions;
		current.levelsBoards = current.levelsBoards.slice(0, idx + 1);
		current.userPositions = current.userPositions.slice(0, idx + 1);

		gameData[key] = current;
		localStorage.setItem("parity-game-data", JSON.stringify(gameData));

		// Reset immediately to avoid races with the next level's play
		reset();
	}, [
		currentLevel,
		currentGameConfig,
		user_address,         // include key inputs in deps
		levelBoards,
		userPositions,
		reset,
	]);

	const goToNextLevel = useCallback(() => {
		setCurrentLevel(prev => {
			const next = (prev ?? 0) + 1; // correct 1-based progression

			if (next > levels.length) {
				setGameState("proving");
				return prev ?? levels.length;
			}

			setGameState("running");
			const nextBoard = levels[next - 1].board;
			const nextPos = levels[next - 1].initialPos;
			startLevel(nextPos, nextBoard);

			return next;
		});

		const newLevelReached = (currentLevel || 0) + 1;
		if (currentLevel && newLevelReached > playerLevelReached) {
			setPlayerLevelReached(newLevelReached);
		}
	}, [levels, setCurrentLevel, setGameState, startLevel, currentLevel, playerLevelReached, setPlayerLevelReached]);

	const gameComponentBasedOnState: {
		[key in ParityGameState]: ReactNode;
	} = {
		home: (
			<div className="flex flex-col gap-6 h-full w-full justify-center items-center">
				<h1 className="text-2xl font-normal">Parity</h1>
				{isLoading ? (
					<p className="text-lg text-text-100">Loading...</p>
				) : gamesHaveFinished ? (
					<p className="text-lg text-text-100">There are no more games available to play...</p>
				) : (
					<>
						<Button
							variant="arcade"
							className="max-w-[300px] w-full"
							disabled={!user_address}
							disabledTextOnHover="You need to connect your wallet first"
							onClick={() => {
								setCurrentLevel(null);
								if (!hasPlayedTutorial) {
									setGameState("tutorial");
								} else {
									setGameState("running");
								}
							}}
						>
							Play
						</Button>
						<Button
							variant="arcade"
							className="max-w-[300px] w-full"
							disabled={!user_address}
							disabledTextOnHover="You need to connect your wallet first"
							onClick={() => setGameState("proving")}
						>
							Submit Proof
						</Button>
						<Button
							variant="arcade"
							className="max-w-[300px] w-full"
							onClick={() => setGameState("tutorial")}
						>
							Tutorial
						</Button>
					</>
				)}
			</div>
		),
		tutorial: (
			<ParityTutorial
				setHasPlayedTutorial={setHasPlayedTutorial}
				setGameState={setGameState}
			/>
		),
		running: (
			<PlayState
				levels={levels}
				currentLevel={currentLevel}
				playerLevelReached={playerLevelReached}
				setCurrentLevel={setCurrentLevel}
				setGameState={setGameState}
				timeRemaining={timeRemaining}
				hasWon={hasWon}
				positionIdx={positionIdx}
				values={values}
				reset={reset}
				setValues={setValues}
				setPosition={setPosition}
				setHasWon={setHasWon}
				saveLevelData={saveLevelData}
				user_positions={userPositions}
				updatePos={updatePos}
			/>
		),
		"after-level": (
			<AfterLevelCompletion
				goToNextLevel={goToNextLevel}
				setGameState={setGameState}
			/>
		),
		proving: (
			<ProveAndSubmit
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				currentGameConfig={currentGameConfig}
				setGameState={setGameState}
				submittedLevelOnChain={Number(currentGameLevelCompleted.data)}
				timeRemaining={timeRemaining}
				nft_contract_address={nft_contract_address}
				gameIdx={currentGameIdx}
				highestLevelReached={highest_level_reached}
				highestLevelReachedProofId={highest_level_reached_proof_id}
				setPlayerLevelReached={setPlayerLevelReached}
			/>
		),
	};

	const view = useSwapTransition(
		gameState,
		(_, state) => gameComponentBasedOnState[state],
		{ className: "h-full w-full flex items-center justify-center" }
	);

	return (
		<div className="bg-contrast-300 h-[675px] py-10 w-full rounded">
			{view}
		</div>
	);
};
