import { useEffect, useState, useRef } from "react";

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

	const userPositions = useRef<[[number, number]]>([[initialPosition.col, initialPosition.row]]);
	const levelBoards = useRef<[[number, number, number, number, number, number, number, number, number]]>([[initialValues[0], initialValues[1], initialValues[2], initialValues[3], initialValues[4], initialValues[5], initialValues[6], initialValues[7], initialValues[8]]]);

	const reset = () => {
		setValues(initialValues);
		setPosition(initialPosition);

		userPositions.current = [[initialPosition.col, initialPosition.row]];
		levelBoards.current = [[initialValues[0], initialValues[1], initialValues[2], initialValues[3], initialValues[4], initialValues[5], initialValues[6], initialValues[7], initialValues[8]]];
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

					userPositions.current.push([newCol, newRow]);
					levelBoards.current.push([next[0], next[1], next[2], next[3], next[4], next[5], next[6], next[7], next[8]]);

					return next;
				});

				return { row: newRow, col: newCol };
			});
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [size]);

	return {
		values,
		position,
		positionIdx: position.row * size + position.col,
		reset,
		hasWon,
		userPositions,
		levelBoards,
	};
};
