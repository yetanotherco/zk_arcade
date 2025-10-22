import { useEffect, useRef, useState } from "react";

const MUSIC_ACTIVE_KEY = "music-active";
const MUSIC_TIME_KEY = "music-time";
const MUSIC_SRC = "/audio/music.mp3";

export const useBackgroundMusic = () => {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const lastSavedRef = useRef<number>(0);
	const [musicActive, setMusicActive] = useState<
		boolean | null | undefined
	>();

	const getSavedTime = () => {
		const t = sessionStorage.getItem(MUSIC_TIME_KEY);
		const sec = t ? Number(t) : 0;
		return Number.isFinite(sec) && sec >= 0 ? sec : 0;
	};

	const ensureAudio = () => {
		let a = document.getElementById("bgm-audio") as HTMLAudioElement | null;

		if (!a) {
			a = document.createElement("audio");
			a.id = "bgm-audio";
			a.src = MUSIC_SRC;
			a.loop = true;
			a.preload = "auto";
			a.volume = 0.05;
			document.body.appendChild(a);
		}

		audioRef.current = a;
		return a;
	};

	const saveTime = () => {
		const a = audioRef.current;
		if (!a) return;
		sessionStorage.setItem(
			MUSIC_TIME_KEY,
			String(Math.floor(a.currentTime))
		);
	};

	const onTimeUpdate = () => {
		const now = performance.now();
		if (now - lastSavedRef.current > 1000) {
			lastSavedRef.current = now;
			saveTime();
		}
	};

	const hookPersistEvents = (a: HTMLAudioElement, attach: boolean) => {
		const handlerPageHide = () => saveTime();
		const handlerVisibility = () => {
			if (document.hidden) saveTime();
		};

		if (attach) {
			a.addEventListener("timeupdate", onTimeUpdate);
			window.addEventListener("pagehide", handlerPageHide);
			document.addEventListener("visibilitychange", handlerVisibility);
			return () => {
				a.removeEventListener("timeupdate", onTimeUpdate);
				window.removeEventListener("pagehide", handlerPageHide);
				document.removeEventListener(
					"visibilitychange",
					handlerVisibility
				);
			};
		} else {
			a.removeEventListener("timeupdate", onTimeUpdate);
			window.removeEventListener("pagehide", handlerPageHide);
			document.removeEventListener("visibilitychange", handlerVisibility);
			return () => {};
		}
	};

	const startMusic = async () => {
		const a = ensureAudio();
		const resumeAt = getSavedTime();
		a.currentTime = resumeAt;
		await a.play().catch(() => {});
		hookPersistEvents(a, true);
	};

	const stopMusic = () => {
		const a = audioRef.current;
		if (!a) return;
		saveTime();
		a.pause();
		hookPersistEvents(a, false);
	};

	const isReload = () => {
		const nav = performance.getEntriesByType?.(
			"navigation"
		) as PerformanceNavigationTiming[];
		if (nav && nav[0]) return nav[0].type === "reload";
		if (performance.navigation) return performance.navigation.type === 1;
		return false;
	};

	const updateMusicIsActive = (newValue: boolean) => {
		setMusicActive(newValue);
		localStorage.setItem(MUSIC_ACTIVE_KEY, JSON.stringify(newValue));
	};

	useEffect(() => {
		if (isReload()) {
			const prevValue = localStorage.getItem(MUSIC_ACTIVE_KEY);
			// Remove the item only if the user did not deactivate the music
			// this is because the browser requires an initial interaction before starting an audio
			// if the user has muted the music before, save tha preference and do not re-prompt
			if (prevValue === "true") localStorage.removeItem(MUSIC_ACTIVE_KEY);
		}

		const active = localStorage.getItem(MUSIC_ACTIVE_KEY);
		if (active) {
			setMusicActive(JSON.parse(active));
		} else {
			setMusicActive(null);
		}
		const audio = ensureAudio();
		audio.addEventListener("play", () => {
			setMusicActive(true);
		});

		audio.addEventListener("pause", () => {
			setMusicActive(false);
		});
	}, []);

	return {
		musicActive,
		updateMusicIsActive,
		startMusic,
		stopMusic,
	};
};
