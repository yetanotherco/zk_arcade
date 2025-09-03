import { Address, encodePacked, keccak256 } from "viem";

export type ParityGameState =
	| "home"
	| "tutorial"
	| "running"
	| "after-level"
	| "proving";

export type ParityLevel = {
	initialPos: {
		row: number;
		col: number;
	};
	board: number[];
};

export type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const gameDataKey = (gameConfig: string, userAddress: Address) => {
	return keccak256(
		encodePacked(["uint256", "address"], [BigInt(gameConfig), userAddress])
	);
};
