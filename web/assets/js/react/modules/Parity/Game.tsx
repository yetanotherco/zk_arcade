import React, { ReactNode, useState } from "react";
import { Button } from "../../components";
import { ParityTutorial } from "./Tutorial";
import { ParityGameState } from "./types";
import { PlayState } from "./PlayState";
import { useSwapTransition } from "./useSwapTransition";

export const Game = () => {
	const [gameState, setGameState] = useState<ParityGameState>("home");
	const gameComponentBasedOnState: {
		[key in ParityGameState]: ReactNode;
	} = {
		home: (
			<div className="flex flex-col gap-6 h-full w-full justify-center items-center">
				<h1 className="text-2xl font-normal">Parity</h1>
				<Button
					variant="arcade"
					className="max-w-[300px] w-full"
					onClick={() => setGameState("running")}
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
			</div>
		),
		tutorial: <ParityTutorial setGameState={setGameState} />,
		running: <PlayState setGameState={setGameState} />,
		submission: <div>Submission</div>,
		proving: <div>Proving</div>,
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
