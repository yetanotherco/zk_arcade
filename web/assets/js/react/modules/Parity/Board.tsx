import React, { useEffect } from "react";
import { Button } from "../../components";

type Props = {
	values: number[];
	positionIdx: number;
	reset: () => void;
	levelNumber: number;
	totalLevels: number;
	home: () => void;
};

const Tile = ({
	value,
	currentPos,
}: {
	value: number | string;
	currentPos: boolean;
}) => {
	const prev = React.useRef(value);
	const [changed, setChanged] = React.useState(false);

	useEffect(() => {
		if (prev.current !== value) {
			const sound = new Audio("/audio/slide_sound.mp3");
			sound.play();
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
				"border-accent-100 bg-accent-100/20",
				currentPos ? "bg-accent-200/50" : "",
				changed ? "scale-102 ring-2 ring-accent-100" : "ring-0",
			].join(" ")}
		>
			<p
				className={[
					"text-4xl transition-transform duration-300",
					changed ? "scale-105" : "scale-100",
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
}: Props) => {
	return (
		<div className="h-full flex flex-col justify-center items-center gap-2">
			<div className="grid grid-cols-3 grid-rows-3">
				{values.map((val, idx) => (
					<Tile
						key={idx}
						value={val}
						currentPos={positionIdx === idx}
					/>
				))}
			</div>
			<div className="w-full flex justify-between items-center">
				<p>
					Level {levelNumber}/{totalLevels}
				</p>
				<Button
					variant="arcade"
					className="cursor-pointer"
					arcadeBtnFront={{ style: { padding: "2px 10px" } }}
					onClick={home}
				>
					Home
				</Button>
				<Button
					variant="arcade"
					className="cursor-pointer"
					arcadeBtnFront={{ style: { padding: "2px 10px" } }}
					onClick={reset}
				>
					Reset
				</Button>
			</div>
		</div>
	);
};
