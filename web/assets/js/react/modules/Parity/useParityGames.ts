import { useState } from "react";
import { Address } from "viem";

// TODO: this is all hardcoded for now, we would query this from the backend or contract
export const useParityGames = (_userAddress: Address) => {
	const playerLevelReached = 1;
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
	const renewsIn = new Date();

	return {
		playerLevelReached,
		currentLevel,
		setCurrentLevel,
		levels,
		renewsIn,
	};
};
