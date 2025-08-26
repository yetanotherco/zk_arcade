import React, { useEffect } from "react";
import { ParityGameState, ParityLevel } from "./types";
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
	renewsIn,
	values,
	setValues,
	positionIdx,
	reset,
	hasWon,
}: {
	setGameState: (state: ParityGameState) => void;
	currentLevel: number | null;
	levels: ParityLevel[];
	setCurrentLevel: (level: number) => void;
	playerLevelReached: number;
	renewsIn: Date;
	values: number[];
	setValues: (values: number[]) => void;
	positionIdx: number;
	reset: () => void;
	hasWon: boolean;
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
				/>
			),
		{ className: "h-full w-full flex items-center justify-center" }
	);

	useEffect(() => {
		if (hasWon) setGameState("proving");
	}, [hasWon]);

	return (
		<div className="w-full h-full flex flex-col gap-4 items-center">
			<h2 className="text-2xl font-normal text-center">
				{currentLevel !== null ? "Parity" : "Select level"}
			</h2>
			{currentLevel === null && (
				<p className="text-text-200 text-center">
					Select a level to play. New levels unlock as you progress!
				</p>
			)}
			<div className="w-full h-full flex justify-center items-center">
				{view}
			</div>
			{currentLevel === null && (
				<p className="text-text-200 text-center">
					Levels renew in{" "}
					<span className="text-accent-100">
						{renewsIn.getHours()} hours
					</span>
					.
				</p>
			)}
		</div>
	);
};
