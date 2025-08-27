import React, { createContext, ReactNode, useContext, useState } from "react";

type AudioContextType = {
	muted: boolean;
	toggleMuted: () => void;
};

const AudioContext = createContext<AudioContextType>({
	muted: false,
	toggleMuted: () => false,
});

export const useAudioState = () => {
	const ctx = useContext(AudioContext);

	return ctx;
};

export const AudioProvider = ({ children }: { children: ReactNode }) => {
	const [muted, setMuted] = useState<boolean>(() => {
		const stored = localStorage.getItem("muted");
		return stored ? JSON.parse(stored) : false;
	});

	const toggleMuted = () => {
		setMuted(prev => {
			const next = !prev;
			localStorage.setItem("muted", JSON.stringify(next));
			return next;
		});
	};

	return (
		<AudioContext.Provider value={{ muted, toggleMuted }}>
			{children}
		</AudioContext.Provider>
	);
};
