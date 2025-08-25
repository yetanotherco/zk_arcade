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

export const Game = ({
	leaderboard_address,
}: {
	userAddress: Address;
	leaderboard_address: Address;
}) => {
	const [gameState, setGameState] = useState<ParityGameState>("home");
	const { muted, toggleMuted } = useAudioState();
	const {
		currentLevel,
		levels,
		playerLevelReached,
		setCurrentLevel,
		renewsIn,
	} = useParityGames({ leaderBoardContractAddress: leaderboard_address });

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
		tutorial: <ParityTutorial setGameState={setGameState} />,
		running: (
			<PlayState
				levels={levels}
				currentLevel={currentLevel}
				playerLevelReached={playerLevelReached}
				setCurrentLevel={setCurrentLevel}
				setGameState={setGameState}
				renewsIn={renewsIn}
			/>
		),
		proving: <ProveAndSubmit goToNextLevel={goToNextLevel} />,
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
