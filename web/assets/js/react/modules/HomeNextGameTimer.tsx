import React, { useEffect, useState } from "react";
import { Address } from "viem";

type Props = {
	leaderboard_address: Address;
	network: string;
	next_game_starts_at?: string | null;
};

const Component = ({
	nextGameStartsAt,
}: {
	nextGameStartsAt?: string | null;
}) => {
	const [timeRemaining, setTimeRemaining] = useState<{
		days: number;
		hours: number;
		minutes: number;
		seconds: number;
	} | null>(null);

	useEffect(() => {
		if (!nextGameStartsAt) {
			setTimeRemaining(null);
			return;
		}

		const startsAtSeconds = Number(nextGameStartsAt);
		if (!Number.isFinite(startsAtSeconds) || startsAtSeconds <= 0) {
			setTimeRemaining(null);
			return;
		}

		const tick = () => {
			const nowSeconds = Math.floor(Date.now() / 1000);
			const totalSeconds = Math.max(
				0,
				Math.floor(startsAtSeconds) - nowSeconds
			);
			const days = Math.floor(totalSeconds / 86400);
			const hours = Math.floor((totalSeconds % 86400) / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);
			const seconds = totalSeconds % 60;
			setTimeRemaining({ days, hours, minutes, seconds });
		};

		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [nextGameStartsAt]);

	return (
		<div className="relative overflow-hidden rounded-xl h-full w-full p-4 bg-contrast-300/60 border border-white/10 shadow-2xl">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent-100/15 via-transparent to-contrast-100/5"
			/>

			<div className="relative flex flex-col justify-between h-full">
				<div>
					<p className="text-text-100/80 text-xs tracking-widest uppercase mb-2">
						Next games in
					</p>
					{!nextGameStartsAt ? (
						<h1 className="font-semibold text-3xl sm:text-4xl mb-1 bg-gradient-to-r from-accent-100 to-white/90 bg-clip-text text-transparent drop-shadow-lg">
							No more games, campaign has ended
						</h1>
					) : timeRemaining ? (
						<h1 className="font-semibold text-4xl sm:text-5xl mb-1 bg-gradient-to-r from-accent-100 to-white/90 bg-clip-text text-transparent drop-shadow-lg">
							{timeRemaining.days}d {timeRemaining.hours}h{" "}
							{timeRemaining.minutes}m {timeRemaining.seconds}s
						</h1>
					) : (
						<p className="text-text-200">Calculating…</p>
					)}
				</div>
				<div className="flex w-full justify-end">
					<p className="inline-flex items-center gap-2 text-text-100 text-xs bg-contrast-100/70 px-2 py-1 rounded border border-white/10 shadow-md">
						<span className="inline-block w-2 h-2 rounded-full bg-accent-100 ring-2 ring-accent-100/40 animate-pulse" />
						Live updates
					</p>
				</div>
			</div>
		</div>
	);
};

export default ({ next_game_starts_at }: Props) => {
	return <Component nextGameStartsAt={next_game_starts_at} />;
};
