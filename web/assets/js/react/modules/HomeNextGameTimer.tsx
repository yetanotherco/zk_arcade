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
		<div className="row-span-2 bg-contrast-300 p-2 flex flex-col justify-between rounded h-full w-full">
			<div>
				<p className="text-text-100 text-sm mb-2">Next game in</p>
				{timeRemaining ? (
					<h1 className="font-normal text-accent-100 text-4xl mb-1">
						{timeRemaining.days}d {timeRemaining.hours}h{" "}
						{timeRemaining.minutes}m
					</h1>
				) : (
					<p className="text-text-200">Calculating…</p>
				)}
			</div>
			<div className="flex w-full justify-end">
				<p
					className="text-text-100 bg-contrast-100 text-sm rounded"
					style={{ padding: "0 5px" }}
				>
					Live updates
				</p>
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
