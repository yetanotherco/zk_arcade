import React from "react";
import { useSpring, animated } from "@react-spring/web";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useToast, Toast as Props } from "../../state/toast";
import { useToggle } from "../../hooks/useToggle";

export const Toast: React.FC<Props> = ({ id, title, desc, type }) => {
	const { removeToastById } = useToast();
	const [progress, setProgress] = useState(0);
	const [paused, togglePaused] = useToggle(false);
	const [hide, setHide] = useState(false);

	const springs = useSpring({
		from: { opacity: !hide ? 0 : 1, y: !hide ? 10 : 0 },
		to: { opacity: !hide ? 1 : 0, y: !hide ? 0 : 10 },
		config: {
			duration: 200,
		},
		onRest: () => hide && removeToastById(id),
	});

	useEffect(() => {
		if (paused) return;
		if (progress >= 1) {
			setHide(true);
			return;
		}
		setTimeout(() => {
			setProgress(prev => prev + 16 / 10000);
		}, 16);
	}, [progress, paused]);

	return (
		<animated.div
			id="toast"
			onMouseEnter={togglePaused}
			onMouseLeave={togglePaused}
			onClick={() => setHide(true)}
			className={clsx(
				"relative flex cursor-pointer mr-4 mb-4 items-center gap-10 rounded px-8 py-4 shadow-md",
				{
					"bg-green-200 border border-green-400 text-black":
						type === "success",
					"bg-red-200 border border-red-400 text-black":
						type === "error",
					"bg-yellow-200 border border-yellow-400 text-black":
						type === "warning",
				}
			)}
			style={{ maxWidth: 500, ...springs }}
		>
			<div>
				<p className="text-md">{title}</p>
				{desc && <p className="text-sm mt-1">{desc}</p>}
			</div>

			{/* Progress bar */}
			<div
				className={clsx("absolute bottom-0 left-0 h-1", {
					"bg-green-500": type === "success",
					"bg-red-500": type === "error",
					"bg-yellow-500": type === "warning",
				})}
				style={{ width: `${progress * 100}%` }}
			/>
		</animated.div>
	);
};
