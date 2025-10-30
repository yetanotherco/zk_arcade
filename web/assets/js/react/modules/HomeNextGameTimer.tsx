import React, { useEffect, useState } from "react";
import { Address, zeroAddress } from "viem";
import Web3EthProvider from "../providers/web3-eth-provider";
import { useBeastLeaderboardContract } from "../hooks";
import { useBlock } from "wagmi";

type Props = {
	leaderboard_address: Address;
	network: string;
};

const Component = ({ leaderboardAddress }: { leaderboardAddress: Address }) => {
	const currentBlock = useBlock();
	const { nextGame, currentGame } = useBeastLeaderboardContract({
		contractAddress: leaderboardAddress,
		userAddress: zeroAddress,
	});

	const [timeRemaining, setTimeRemaining] = useState<{
		days: number;
		hours: number;
		minutes: number;
	} | null>(null);

	useEffect(() => {
		const startsAtTime = nextGame.data?.startsAtTime || 0n;
		const currentBlockTimestamp = currentBlock.data
			? currentBlock.data.timestamp
			: 0;

		if (startsAtTime > 0 && currentBlockTimestamp) {
			const totalSeconds = Math.max(
				0,
				Number(startsAtTime) - Number(currentBlockTimestamp)
			);
			const days = Math.floor(totalSeconds / 86400);
			const hours = Math.floor((totalSeconds % 86400) / 3600);
			const minutes = Math.floor((totalSeconds % 3600) / 60);

			setTimeRemaining({ days, hours, minutes });
		}
	}, [nextGame.data, currentGame.data, currentBlock.data]);

	return (
		<div className="relative overflow-hidden rounded-xl h-full w-full p-4 bg-contrast-300/60 border border-white/10 shadow-2xl">
			{/* ambient gradient glow */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-accent-100/15 via-transparent to-contrast-100/5"
			/>

			<div className="relative flex flex-col justify-between h-full">
				<div>
					<p className="text-text-100/80 text-xs tracking-widest uppercase mb-2">
						Next games in
					</p>
					{timeRemaining ? (
						<h1 className="font-semibold text-4xl sm:text-5xl mb-1 bg-gradient-to-r from-accent-100 to-white/90 bg-clip-text text-transparent drop-shadow-lg">
							{timeRemaining.days}d {timeRemaining.hours}h{" "}
							{timeRemaining.minutes}m
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

export default ({ leaderboard_address, network }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<Component leaderboardAddress={leaderboard_address} />
		</Web3EthProvider>
	);
};
