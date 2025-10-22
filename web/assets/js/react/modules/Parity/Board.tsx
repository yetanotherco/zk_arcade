import React, { useEffect } from "react";
import { Button } from "../../components";
import { useAudioState } from "../../state/audio";
import { PARITY_MAX_MOVEMENTS } from "../../constants/parity";

type Props = {
	values: number[];
	positionIdx: number;
	reset: () => void;
	levelNumber: number;
	totalLevels: number;
	home: () => void;
	user_positions: [number, number][];
	updatePos: (_: { dr: number; dc: number }) => void;
};

const Tile = ({
	value,
	currentPos,
	gameEnded,
	onClick,
	canMove,
}: {
	value: number | string;
	currentPos: boolean;
	gameEnded: boolean;
	canMove: boolean;
	onClick: () => void;
}) => {
	const prev = React.useRef(value);
	const { muted } = useAudioState();
	const [changed, setChanged] = React.useState(false);

	useEffect(() => {
		if (prev.current !== value) {
			if (!muted) {
				const sound = new Audio("/audio/slide_sound.mp3");
				sound.play();
			}
			setChanged(true);
			const t = setTimeout(() => setChanged(false), 350);
			prev.current = value;
			return () => clearTimeout(t);
		}
	}, [value]);

	return (
		<div
			className={[
				"h-[100px] sm:h-[150px] w-[100px] sm:w-[150px] flex items-center justify-center text-xl",
				"border transition-all",
				gameEnded
					? "border-gray-400 bg-gray-200 opacity-70"
					: "border-accent-100 bg-accent-100/20",
				currentPos && !gameEnded ? "bg-accent-200/50" : "",
				changed && !gameEnded
					? "scale-102 ring-2 ring-accent-100"
					: "ring-0",
				canMove && "cursor-pointer",
			].join(" ")}
			onClick={onClick}
		>
			<p
				className={[
					"text-4xl transition-transform duration-300",
					gameEnded ? "text-gray-500" : "",
					changed && !gameEnded ? "scale-105" : "scale-100",
				].join(" ")}
			>
				{value}
			</p>
		</div>
	);
};

export const ParityBoard = ({
	values,
	levelNumber,
	totalLevels,
	home,
	reset,
	user_positions,
	positionIdx,
	updatePos,
}: Props) => {
	const { muted, toggleMuted } = useAudioState();

	const userMovements =
		user_positions.length > 0 ? user_positions.length - 1 : 0;
	const remainingMovements = PARITY_MAX_MOVEMENTS - userMovements;

	const getMoveDx = (idx: number) => {
		if (remainingMovements <= 0) return null;

		const size = 3;
		const curRow = Math.floor(positionIdx / size);
		const curCol = positionIdx % size;

		const tgtRow = Math.floor(idx / size);
		const tgtCol = idx % size;

		const dr = tgtRow - curRow;
		const dc = tgtCol - curCol;

		if (Math.abs(dr) + Math.abs(dc) === 1)
			return {
				dr,
				dc,
			};
	};

	return (
		<div className="h-full flex flex-col justify-center items-center gap-4">
			<div className="grid grid-cols-3 grid-rows-3">
				{values.map((val, idx) => (
					<Tile
						key={idx}
						value={val}
						currentPos={positionIdx === idx}
						gameEnded={remainingMovements <= 0}
						canMove={!!getMoveDx(idx)}
						onClick={() => {
							const move = getMoveDx(idx);
							if (move) {
								updatePos(move);
							}
						}}
					/>
				))}
			</div>
			<div className="max-w-[450px] text-sm mx-auto">
				{remainingMovements <= 0 && (
					<p className="mb-1 text-red text-center">
						You've reached the maximum number of moves. Reset reset
						the level to try again.
					</p>
				)}
			</div>
			<div className="w-full flex sm:flex-row sm:gap-0 flex-wrap gap-5 sm:justify-between justify-center items-center">
				<p>
					Level {levelNumber}/{totalLevels}
				</p>
				<div
					className={`${
						remainingMovements <= 5
							? "text-red"
							: remainingMovements <= 10
							? "text-orange"
							: ""
					}`}
				>
					<p>
						Moves {userMovements}/{PARITY_MAX_MOVEMENTS}
					</p>
				</div>

				<Button
					variant="arcade"
					className="cursor-pointer"
					arcadeBtnFront={{ style: { padding: "2px 10px" } }}
					onClick={home}
				>
					Home
				</Button>
				<div className="flex items-start gap-4">
					<Button
						variant="arcade"
						className="cursor-pointer"
						arcadeBtnFront={{ style: { padding: "2px 10px" } }}
						onClick={reset}
					>
						Reset
					</Button>
					<Button
						variant="text"
						className="cursor-pointer"
						arcadeBtnFront={{ style: { padding: "2px 10px" } }}
						onClick={toggleMuted}
					>
						<span
							className={`${
								muted
									? "hero-speaker-x-mark"
									: "hero-speaker-wave"
							}`}
						></span>
					</Button>
				</div>
			</div>
			<p className="text-sm text-center text-text-200 sm:text-left sm:w-auto w-full">
				Move <span className="font-bold">[WASD]</span> - Reset{" "}
				<span className="font-bold">[R]</span>
			</p>
		</div>
	);
};
