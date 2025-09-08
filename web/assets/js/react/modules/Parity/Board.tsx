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
};

const Tile = ({
	value,
	currentPos,
	gameEnded,
}: {
	value: number | string;
	currentPos: boolean;
	gameEnded: boolean;
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
				"border transition-all duration-300 ease-out will-change-transform",
				gameEnded
					? "border-gray-400 bg-gray-200 opacity-70"
					: "border-accent-100 bg-accent-100/20",
				currentPos && !gameEnded ? "bg-accent-200/50" : "",
				changed && !gameEnded
					? "scale-102 ring-2 ring-accent-100"
					: "ring-0",
			].join(" ")}
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
	positionIdx,
	levelNumber,
	totalLevels,
	home,
	reset,
	user_positions,
}: Props) => {
	const { muted, toggleMuted } = useAudioState();

	const userMovements =
		user_positions.length > 0 ? user_positions.length - 1 : 0;
	const remainingMovements = PARITY_MAX_MOVEMENTS - userMovements;

	return (
		<div className="h-full flex flex-col justify-center items-center gap-4">
			<div className="grid grid-cols-3 grid-rows-3">
				{values.map((val, idx) => (
					<Tile
						key={idx}
						value={val}
						currentPos={positionIdx === idx}
						gameEnded={remainingMovements <= 0}
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
			<div className="w-full flex justify-between items-center">
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
		</div>
	);
};
