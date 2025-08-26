export type ParityGameState =
	| "home"
	| "tutorial"
	| "running"
	| "proving"
	| "all-levels-completed";

export type ParityLevel = {
	initialPos: {
		row: number;
		col: number;
	};
	board: number[];
};
