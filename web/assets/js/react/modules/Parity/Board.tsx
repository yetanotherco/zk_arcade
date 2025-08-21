import React from "react";

type Props = {
	values: number[];
	positionIdx: number;
};

const Tile = ({
	value,
	currentPos,
}: {
	value: number | string;
	currentPos: boolean;
}) => {
	return (
		<div
			className={`border border-accent-100 bg-accent-100/20 h-[150px] w-[150px] flex items-center justify-center text-xl ${
				currentPos ? "animate-pulse bg-accent-200/50" : ""
			}`}
		>
			<p className="text-4xl">{value}</p>
		</div>
	);
};

export const ParityBoard = ({ values, positionIdx }: Props) => {
	return (
		<div className="w-full h-full flex justify-center items-center ">
			<div className="grid grid-cols-3 grid-rows-3">
				{values.map((val, idx) => (
					<Tile
						key={idx}
						value={val}
						currentPos={positionIdx === idx}
					/>
				))}
			</div>
		</div>
	);
};
