import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components";
import { useSpring, animated } from "@react-spring/web";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";

export const BackgroundMusicPromptBtn = () => {
	const [hide, setHide] = useState(false);
	const [visible, setVisible] = useState(false);
	const { startMusic, stopMusic, musicActive, updateMusicIsActive } =
		useBackgroundMusic();

	const springs = useSpring({
		from: {
			opacity: !hide ? 0 : 1,
			y: !hide ? 50 : 0,
			scale: !hide ? 0.98 : 1,
		},
		to: {
			opacity: !hide ? 1 : 0,
			y: !hide ? 0 : 50,
			scale: !hide ? 1 : 0.98,
		},
		config: { duration: 200 },
		onRest: () => hide && setVisible(false),
	});

	useEffect(() => {
		if (musicActive === undefined) return;

		if (musicActive === null) {
			setVisible(true);
			return;
		}

		if (musicActive) {
			startMusic();
		}
	}, [musicActive]);

	useEffect(() => {
		return () => {
			stopMusic();
		};
	}, []);

	const onConfirm = () => {
		updateMusicIsActive(true);
		startMusic();
		setHide(true);
	};

	const onCancel = () => {
		updateMusicIsActive(false);
		stopMusic();
		setHide(true);
	};

	useEffect(() => {
		return () => {
			stopMusic();
		};
	}, []);

	if (!visible) return null;

	return createPortal(
		<div className="fixed inset-x-0 bottom-[8%] z-10 flex w-full justify-center">
			<div className="absolute bottom-[6%] h-40 w-[80%] max-w-md rounded-full bg-accent-100/30 blur-3xl pointer-events-none" />
			<animated.div
				className="relative rounded p-5 bg-contrast-100/90 backdrop-blur-md border border-white/10 shadow-2xl shadow-black/40 ring-1 ring-black/10 max-w-[90vw] sm:max-w-md"
				style={springs}
			>
				<div className="flex items-start gap-3">
					<div className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-100/20 border border-accent-100/40">
						<svg
							viewBox="0 0 24 24"
							aria-hidden="true"
							className="h-5 w-5"
						>
							<path
								d="M9 18.5a2.5 2.5 0 1 0 0-5c-.46 0-.9.12-1.28.33V6.5l10-2V13a2.5 2.5 0 1 0 1.5 2.3V4.5a1 1 0 0 0-1.22-.98l-10 2A1 1 0 0 0 7 6.5v8.33A2.49 2.49 0 0 0 9 18.5Z"
								fill="currentColor"
							/>
						</svg>
					</div>

					<div className="flex-1">
						<h3 id="music-title" className="mb-1 font-semibold">
							Enable background music?
						</h3>
						<p className="mb-4 text-sm opacity-80">
							We’ve got a smooth casino playlist to set the mood.
						</p>

						<div className="flex gap-3">
							<Button
								className="w-full"
								variant="text"
								onClick={onCancel}
							>
								Not in the mood
							</Button>
							<Button
								className="w-full"
								variant="accent-fill"
								onClick={onConfirm}
							>
								Play music
							</Button>
						</div>
					</div>
				</div>
			</animated.div>
		</div>,
		document.body
	);
};
