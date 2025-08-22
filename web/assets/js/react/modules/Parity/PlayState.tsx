import React, { useEffect, useState } from "react";
import { ParityGameState } from "./types";
import { Button } from "../../components";
import { useParityControls } from "./useParityControls";
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
}: {
	setGameState: (state: ParityGameState) => void;
}) => {
	const playerLevelReached = 1;
	const numberOfGames = 9;
	const [currentLevel, setCurrentLevel] = useState<number | null>(null);
	const levels = [
		[6, 8, 8, 6, 8, 8, 6, 5, 8],
		[-5, -5, -4, -5, -6, -7, -7, -8, -7],
		[0, -2, -3, 1, -1, -1, 1, 0, 1],
		[6, 3, 4, 3, 0, 3, 2, 0, 3],
		[-7, -10, -9, -8, -12, -13, -8, -11, -13],
		[4, 3, 2, 4, 3, 0, 4, 3, 1],
		[5, 6, 5, 1, 1, 4, 4, 4, 6],
		[17, 16, 15, 17, 17, 16, 18, 18, 18],
		[-2, -2, -2, -3, -3, -7, -4, -8, -11],
	];
	const { hasWon, positionIdx, values, reset, setValues } = useParityControls(
		{
			initialPosition: { col: 0, row: 0 },
			initialValues: currentLevel
				? levels[currentLevel]
				: [0, 0, 0, 0, 0, 0, 0, 0, 0],
		}
	);

	const view = useSwapTransition(
		currentLevel,
		(_, level) =>
			!level ? (
				<PickGame
					setLevel={number => {
						setCurrentLevel(number);
						setValues(levels[number]);
					}}
					numberOfGames={numberOfGames}
					unlockedUntil={playerLevelReached}
				/>
			) : (
				<ParityBoard
					values={values}
					positionIdx={positionIdx}
					levelNumber={level}
					totalLevels={numberOfGames}
					reset={reset}
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
				{currentLevel ? "Parity" : "Select level"}
			</h2>
			{!currentLevel && (
				<p className="text-text-200 text-center">
					Select a level to play. New levels unlock as you progress!
				</p>
			)}
			<div className="w-full h-full flex justify-center items-center">
				{view}
			</div>
			{!currentLevel && (
				<p className="text-text-200 text-center">
					Levels renew in{" "}
					<span className="text-accent-100">6 hours</span>.
				</p>
			)}
		</div>
	);
};
