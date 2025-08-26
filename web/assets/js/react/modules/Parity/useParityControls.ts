import { useEffect, useState } from "react";

type Position = { row: number; col: number };

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

	const [userPositions, setUserPositions] = useState<[number, number][]>(() => []);
	const [levelBoards, setLevelBoards] = useState<number[][]>(() => []);

	const reset = () => {
		setValues(initialValues);
		setPosition(initialPosition);
		setUserPositions(() => []);
		setLevelBoards(() => []);
	};

	useEffect(() => {
		const onKeyDown = (e: KeyboardEvent) => {
			const k = e.key.toLowerCase();

			const keyToDelta: Record<string, [number, number]> = {
				w: [-1, 0],
				s: [1, 0],
				a: [0, -1],
				d: [0, 1],
			};

			if (!(k in keyToDelta)) return;

			const [dr, dc] = keyToDelta[k];

			setPosition(prev => {
				const newRow = prev.row + dr;
				const newCol = prev.col + dc;
				if (
					newRow < 0 ||
					newRow >= size ||
					newCol < 0 ||
					newCol >= size
				) {
					return prev; // invalid move
				}

				setValues(prevVals => {
					const idx = newRow * size + newCol;
					const next = prevVals.slice();
					next[idx] = (next[idx] ?? 0) + 1;

					// check win: all values equal
					const allEqual = next.every(v => v === next[0]);
					if (allEqual) setHasWon(true);

					if (userPositions.length === 0){
						setUserPositions(prevPos => [...prevPos, [prev.col, prev.row]]);
						setLevelBoards(prevBoards => [...prevBoards, prevVals.slice()]);
					}

					setUserPositions(prevPos => [...prevPos, [newCol, newRow]]);
					setLevelBoards(prevBoards => [...prevBoards, next.slice()]);

					return next;
				});

				return { row: newRow, col: newCol };
			});
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [size, userPositions, levelBoards]);

	return {
		values,
		position,
		positionIdx: position.row * size + position.col,
		reset,
		hasWon,
		userPositions,
		levelBoards,
		setValues,
	};
};
