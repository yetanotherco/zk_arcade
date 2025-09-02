export type ParityGameState =
	| "home"
	| "tutorial"
	| "running"
	| "after-level"
	| "proving"
	| "all-levels-completed";

export type ParityLevel = {
	initialPos: {
		row: number;
		col: number;
	};
	board: number[];
};
