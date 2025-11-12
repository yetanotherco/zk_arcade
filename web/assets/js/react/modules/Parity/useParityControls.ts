import { useEffect, useState } from "react";
import { PARITY_MAX_MOVEMENTS } from "../../constants/parity";

export type Position = { row: number; col: number };

type UseParityControlsArgs = {
	initialPosition: Position;
	initialValues: number[];
	size?: number;
};

export const useParityControls = ({
	initialPosition,
	initialValues,
	size = 3,
}: UseParityControlsArgs) => {
	const [position, setPosition] = useState<Position>(initialPosition);
	const [values, setValues] = useState<number[]>(() => initialValues);
	const [hasWon, setHasWon] = useState(false);

	const [userPositions, setUserPositions] = useState<[number, number][]>(
		() => []
	);
	const [levelBoards, setLevelBoards] = useState<number[][]>(() => []);

	const reset = () => {
		setValues(initialValues);
		setPosition(initialPosition);
		setUserPositions(() => []);
		setLevelBoards(() => []);
		setHasWon(false);
	};

	const startLevel = (pos: Position, vals: number[]) => {
		setPosition(pos);
		setValues(vals);
		setUserPositions([]);
		setLevelBoards([]);
		setHasWon(false);
	};

	const updatePos = ({ dr, dc }: { dr: number; dc: number }) => {
		setPosition(prev => {
			const newRow = prev.row + dr;
			const newCol = prev.col + dc;
			if (newRow < 0 || newRow >= size || newCol < 0 || newCol >= size) {
				return prev; // invalid move
			}

			// gate on current move count using levelBoards length (more robust than userPositions)
			if (levelBoards.length > PARITY_MAX_MOVEMENTS) {
				return prev; // max moves reached
			}

			setValues(prevVals => {
				const prevAllEqual = prevVals.every(v => v === prevVals[0]);
				if (prevAllEqual) {
					return prevVals;
				}

				const idx = newRow * size + newCol;
				const next = prevVals.slice();
				next[idx] = (next[idx] ?? 0) + 1;

				// win?
				if (next.every(v => v === next[0])) setHasWon(true);

				// append snapshots atomically using prev-* inside the updaters
				setLevelBoards(prevBoards => {
					const withStart = prevBoards.length === 0 ? [prevVals.slice()] : prevBoards;
					return [...withStart, next.slice()];
				});

				setUserPositions(prevPos => {
					const withStart = prevPos.length === 0 ? [[prev.col, prev.row] as [number, number]] : prevPos;
					return [...withStart, [newCol, newRow]];
				});

				return next;
			});

			return { row: newRow, col: newCol };
		});
	};

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const k = e.key.toLowerCase();

			if (k === "r") {
				reset();
				return;
			}

			const keyToDelta: Record<string, [number, number]> = {
				w: [-1, 0],
				s: [1, 0],
				a: [0, -1],
				d: [0, 1],
			};

			if (!(k in keyToDelta)) return;

			const [dr, dc] = keyToDelta[k];

			updatePos({
				dr,
				dc,
			});
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [size, updatePos, userPositions.length, levelBoards.length]);

	return {
		values,
		position,
		positionIdx: position.row * size + position.col,
		reset,
		startLevel,
		hasWon,
		userPositions,
		levelBoards,
		setValues,
		setPosition,
		setHasWon,
		updatePos,
	};
};
