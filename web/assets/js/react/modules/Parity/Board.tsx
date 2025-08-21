import React, { useEffect } from "react";

type Props = {
	values: number[];
	positionIdx: number;
	reset: () => void;
	levelNumber: number;
	totalLevels: number;
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

	// Detect value changes
	useEffect(() => {
		if (prev.current !== value) {
			setChanged(true);
			const t = setTimeout(() => setChanged(false), 350); // reset after animation
			prev.current = value;
			return () => clearTimeout(t);
		}
	}, [value]);

	return (
		<div
			className={[
				"h-[150px] w-[150px] flex items-center justify-center text-xl",
				"border transition-all duration-300 ease-out will-change-transform",
				"border-accent-100 bg-accent-100/20",
				currentPos ? "bg-accent-200/50" : "",
				changed ? "scale-105 ring-2 ring-accent-300" : "ring-0",
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
				<p className="cursor-pointer" onClick={reset}>
					Reset
				</p>
			</div>
		</div>
	);
};
