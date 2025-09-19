import React, { useEffect, useRef, useState } from "react";

export const ProgressBar = ({
	shouldAnimate,
	timeToPassMs,
}: {
	shouldAnimate: boolean;
	timeToPassMs: number;
}) => {
	const [progress, setProgress] = useState(0);
	const animationRef = useRef<number | null>(null);
	const startTimeRef = useRef<number | null>(null);

	useEffect(() => {
		if (shouldAnimate) {
			setProgress(0);
			startTimeRef.current = null;

			const step = (timestamp: number) => {
				if (!startTimeRef.current) {
					startTimeRef.current = timestamp;
				}

				const elapsed = timestamp - startTimeRef.current;
				const newProgress = Math.min(
					(elapsed / timeToPassMs) * 100,
					100
				);

				setProgress(newProgress);

				if (newProgress < 100) {
					animationRef.current = requestAnimationFrame(step);
				}
			};

			animationRef.current = requestAnimationFrame(step);
		} else {
			// Reset if stopped
			setProgress(0);
			if (animationRef.current)
				cancelAnimationFrame(animationRef.current);
		}

		return () => {
			if (animationRef.current)
				cancelAnimationFrame(animationRef.current);
		};
	}, [shouldAnimate, timeToPassMs]);

	return (
		<div className="w-full">
			<div className="w-full bg-gray-200 rounded overflow-hidden h-2">
				<div
					className="bg-green-500 h-2 rounded"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
};
