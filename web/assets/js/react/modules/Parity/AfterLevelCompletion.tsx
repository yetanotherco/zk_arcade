import React from "react";
import { Button } from "../../components";
import { ParityGameState } from "./types";

export const AfterLevelCompletion = ({
	goToNextLevel,
	setGameState,
}: {
	goToNextLevel: () => void;
	setGameState: (state: ParityGameState) => void;
}) => {
	return (
		<div>
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Level completed
						</h2>
						<p className="text-text-200 text-center">
							Continue playing or go home to continue later
						</p>
					</div>
					<div className="flex flex-col gap-5 w-full max-w-[300px]">
						<Button
							variant="arcade"
							className="w-full"
							onClick={() => {
								goToNextLevel();
							}}
						>
							Next Level
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
		</div>
	);
};
