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
				"relative flex min-w-[300px] cursor-pointer items-center gap-10 rounded px-8 py-4",
				{
					"border bg-accent-100/20 border-accent-100":
						type === "success",
					"border bg-red/20 border-red": type === "error",
				}
			)}
			style={{ ...springs }}
		>
			<div>
				<p
					className={clsx("text-md", {
						"text-text-100": type === "success",
						"text-white": type === "error",
					})}
				>
					{title}
				</p>
				<p className="text-sm text-text-200">{desc}</p>
			</div>

			{/* Progress bar */}
			<div
				className={clsx("absolute bottom-0 left-0 h-1 transition", {
					"bg-accent-100": type === "success",
					"bg-white": type === "error",
				})}
				style={{ width: `${progress * 100}%` }}
			></div>
		</animated.div>
	);
};
