import React, { ReactNode, useCallback, useState } from "react";
import { Button } from "../../components";
import { ParityTutorial } from "./Tutorial";
import { ParityGameState } from "./types";
import { PlayState } from "./PlayState";
import { ProveAndSubmit } from "./ProveAndSubmit";
import { useSwapTransition } from "./useSwapTransition";
import { useParityGames } from "./useParityGames";
import { Address } from "viem";
import { Completed } from "./Completed";
import { useAudioState } from "../../state/audio";
import { useParityControls } from "./useParityControls";


type GameProps = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	leaderboard_address: Address;
	batcher_url: string;
};

export const Game = ({ network, payment_service_address, user_address, leaderboard_address, batcher_url }: GameProps) => {
	const [gameState, setGameState] = useState<ParityGameState>("home");
	const { muted, toggleMuted } = useAudioState();
	const {
		currentLevel,
		levels,
		playerLevelReached,
		setCurrentLevel,
		renewsIn,
	} = useParityGames({ leaderBoardContractAddress: leaderboard_address });

	const { hasWon, positionIdx, values, reset, setValues, userPositions, levelBoards, setPosition } =
		useParityControls({
			initialPosition:
				currentLevel !== null
					? levels[currentLevel - 1].initialPos
					: { row: 0, col: 0 },
			initialValues:
				currentLevel !== null
					? levels[currentLevel - 1].board
					: [0, 0, 0, 0, 0, 0, 0, 0, 0],
		});

	const goToNextLevel = useCallback(() => {
		setCurrentLevel(prev => {
			if (prev === levels.length) {
				setGameState("all-levels-completed");
				return prev;
			}
			const next = prev == null ? 0 : prev + 1;
			setGameState("running");

			return next;
		});
	}, [levels.length, setCurrentLevel, setGameState]);

	const gameComponentBasedOnState: {
		[key in ParityGameState]: ReactNode;
	} = {
		home: (
			<div className="flex flex-col gap-6 h-full w-full justify-center items-center">
				<h1 className="text-2xl font-normal">Parity</h1>
				<Button
					variant="arcade"
					className="max-w-[300px] w-full"
					onClick={() => {
						setCurrentLevel(null);
						setGameState("running");
					}}
				>
					Play
				</Button>
				<Button
					variant="arcade"
					className="max-w-[300px] w-full"
					onClick={() => setGameState("tutorial")}
				>
					Tutorial
				</Button>
				<Button
					variant="arcade"
					className="max-w-[300px] w-full"
					onClick={toggleMuted}
				>
					{muted ? "Unmute" : "Mute"}
				</Button>
			</div>
		),
		tutorial: <ParityTutorial setGameState={setGameState} gameProps={{ network, payment_service_address, user_address, leaderboard_address, batcher_url }} />,
		running: (
			<PlayState
				levels={levels}
				currentLevel={currentLevel}
				playerLevelReached={playerLevelReached}
				setCurrentLevel={setCurrentLevel}
				setGameState={setGameState}
				renewsIn={renewsIn}
				hasWon={hasWon}
				positionIdx={positionIdx}
				values={values}
				reset={reset}
				setValues={setValues}
				setPosition={setPosition}
			/>
		),
		proving: (
			<ProveAndSubmit
				goToNextLevel={goToNextLevel}
				levelBoards={levelBoards}
				userPositions={userPositions}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
			/>
		),
		"all-levels-completed": (
			<Completed renewsIn={renewsIn} setGameState={setGameState} />
		),
	};

	const view = useSwapTransition(
		gameState,
		(_, state) => gameComponentBasedOnState[state],
		{ className: "h-full w-full flex items-center justify-center" }
	);

	return (
		<div className="bg-contrast-300 h-[600px] py-10 w-full rounded">
			{view}
		</div>
	);
};
