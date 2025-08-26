import React from "react";
import { ParityGameState } from "./types";
import { Button } from "../../components";

export const Completed = ({
	setGameState,
	renewsIn,
}: {
	setGameState: (state: ParityGameState) => void;
	renewsIn: Date;
}) => {
	return (
		<div className="w-full h-full flex flex-col gap-10 justify-center items-center">
			<div>
				<h2 className="text-2xl mb-2 font-normal text-center">
					Game completed
				</h2>
				<p className="text-text-200 text-center">
					You have completed the full game, come in{" "}
					<span className="text-accent-100">
						{renewsIn.getHours()} hours
					</span>{" "}
					for new levels!
				</p>
			</div>
			<Button variant="arcade" onClick={() => setGameState("home")}>
				Ok!
			</Button>
		</div>
	);
};
