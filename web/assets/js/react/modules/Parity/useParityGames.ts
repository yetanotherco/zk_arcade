import { useState } from "react";
import { Address } from "viem";
import { ParityLevel } from "./types";

// TODO: this is all hardcoded for now, we would query this from the backend or contract
export const useParityGames = (_userAddress: Address) => {
	const playerLevelReached = 1;
	const [currentLevel, setCurrentLevel] = useState<number | null>(null);
	const levels: ParityLevel[] = [
		{
			board: [13, 9, 7, 13, 10, 7, 14, 14, 13],
			initialPos: { col: 1, row: 0 },
		},
	];
	const renewsIn = new Date();

	return {
		playerLevelReached,
		currentLevel,
		setCurrentLevel,
		levels,
		renewsIn,
	};
};
