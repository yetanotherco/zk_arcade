import React, { useState } from "react";
import { Button } from "../../components";
import { ParityTutorial } from "./Tutorial";
import { ParityGameState } from "./types";

export const Game = () => {
	const [gameState, setGameState] = useState<ParityGameState>("home");

	const gameComponentBasedOnState = {
		home: (
			<div className="flex flex-col gap-6 h-full justify-center items-center">
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
	};

	return (
		<div className="bg-contrast-300 h-[600px] py-10 w-full rounded">
			{gameComponentBasedOnState[gameState]}
		</div>
	);
};
