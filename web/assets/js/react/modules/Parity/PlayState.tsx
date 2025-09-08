import React, { useEffect } from "react";
import { GameStatus, ParityGameState, ParityLevel } from "./types";
import { Button } from "../../components";
import { ParityBoard } from "./Board";
import { useSwapTransition } from "./useSwapTransition";

const PickGame = ({
	numberOfGames,
	unlockedUntil,
	setLevel,
}: {
	numberOfGames: number;
	unlockedUntil: number;
	setLevel: (level: number) => void;
}) => {
	return (
		<div className="grid grid-cols-3 gap-4 max-w-[500px] w-full">
			{Array.from({ length: numberOfGames }, (_, i) => (
				<Button
					key={i}
					variant="arcade"
					onClick={() => setLevel(i + 1)}
					disabled={i + 1 > unlockedUntil}
				>
					{i + 1}
				</Button>
			))}
		</div>
	);
};

export const PlayState = ({
	setGameState,
	currentLevel,
	playerLevelReached,
	levels,
	setCurrentLevel,
	timeRemaining,
	values,
	setValues,
	positionIdx,
	reset,
	hasWon,
	setPosition,
	setHasWon,
	saveLevelData,
	user_positions,
}: {
	setGameState: (state: ParityGameState) => void;
	currentLevel: number | null;
	levels: ParityLevel[];
	setCurrentLevel: (level: number) => void;
	playerLevelReached: number;
	timeRemaining: {
		hours: number;
		minutes: number;
	} | null;
	values: number[];
	setValues: (values: number[]) => void;
	positionIdx: number;
	reset: () => void;
	hasWon: boolean;
	setPosition: (position: { col: number; row: number }) => void;
	setHasWon: (hasWon: boolean) => void;
	saveLevelData: () => void;
	user_positions: [number, number][];
}) => {
	const view = useSwapTransition(
		currentLevel,
		(_, level) =>
			level == null ? (
				<PickGame
					setLevel={number => {
						setCurrentLevel(number);
						setValues(levels[number - 1].board);
						setPosition(levels[number - 1].initialPos);
					}}
					numberOfGames={levels.length}
					unlockedUntil={playerLevelReached}
				/>
			) : (
				<ParityBoard
					values={values}
					positionIdx={positionIdx}
					levelNumber={level}
					totalLevels={levels.length}
					reset={reset}
					home={() => setGameState("home")}
					user_positions={user_positions}
				/>
			),
		{ className: "h-full w-full flex items-center justify-center" }
	);

	useEffect(() => {
		if (hasWon) {
			saveLevelData();
			if (currentLevel == levels.length) {
				setGameState("proving");
			} else {
				setGameState("after-level");
			}
			setHasWon(false);
		}
	}, [hasWon, setHasWon]);

	return (
		<div className="w-full h-full flex flex-col gap-4 items-center">
			<div className="w-full flex justify-center items-center max-w-[450px]">
				<h2 className="text-2xl font-normal text-center">
					{currentLevel !== null ? "Parity" : "Select level"}
				</h2>

				{currentLevel !== null && (
					<div className="ml-5 relative self-end relative">
						<span className="font-medium text-left group border rounded-full px-1">
							?
							<div
								className="absolute left-1/2 -translate-x-1/2 px-2 mt-2 py-1 text-xs bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity break-words z-10"
								style={{ width: "300px" }}
							>
								Use W, A, S or D to slide the tiles. To restart,
								press R.
							</div>
						</span>
					</div>
				)}
			</div>
			{currentLevel === null && (
				<p className="text-text-200 text-center">
					Select a level to play. New levels unlock as you progress!
				</p>
			)}
			<div className="w-full h-full flex justify-center items-center">
				{view}
			</div>

			{currentLevel === null &&
				(timeRemaining ? (
					<p>
						Levels renew in{" "}
						<span className="text-accent-100">
							{timeRemaining.hours > 0
								? `${timeRemaining.hours} hours`
								: `${timeRemaining.minutes} minutes`}
						</span>
					</p>
				) : (
					<span className="text-accent-100">loading...</span>
				))}
		</div>
	);
};
