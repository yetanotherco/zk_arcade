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
