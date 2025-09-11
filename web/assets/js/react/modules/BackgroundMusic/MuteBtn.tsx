import React from "react";
import { useBackgroundMusic } from "../../hooks/useBackgroundMusic";

export const MuteBackgroundBtn = () => {
	const { musicActive, startMusic, stopMusic, updateMusicIsActive } =
		useBackgroundMusic();

	const onClick = () => {
		if (musicActive) {
			stopMusic();
			updateMusicIsActive(false);
		} else {
			startMusic();
			updateMusicIsActive(true);
		}
	};

	const className =
		"text-text-100 transition hover:text-accent-100 hover:underline" +
		"lg:cursor-pointer lg:block lg:px-4 lg:py-2 lg:text-sm lg:hover:bg-contrast-100 lg:transition-colors lg:rounded-bl-lg lg:rounded-br-lg";

	return (
		<p className={className} onClick={onClick}>
			{musicActive ? "Mute music" : "Unmute Music"}
		</p>
	);
};
