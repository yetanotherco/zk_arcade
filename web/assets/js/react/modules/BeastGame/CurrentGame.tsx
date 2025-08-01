import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import { useLeaderboardContract } from "../../hooks/useLeaderboardContract";
import { useBlockNumber } from "wagmi";

type Props = {
	leaderboard_address: Address;
	user_address: Address;
};

const LevelComponent = ({
	claimed,
	level_number,
	points,
}: {
	level_number: number;
	points: number;
	claimed: boolean;
}) => {
	return (
		<div className="w-full flex flex-col items-center justify-center">
			<div
				className={`w-full h-[10px] rounded ${
					claimed ? "bg-accent-100" : "bg-contrast-100"
				} mb-2`}
			></div>
			<div>
				<p className={`text-md text-text-100 mb-1`}>
					Level {level_number}
				</p>
				<p className="text-sm text-text-200">Points: {points}</p>
				<p className="text-sm text-text-200">
					Claimed: {claimed ? "Yes" : "No"}
				</p>
			</div>
		</div>
	);
};

export const CurrentBeastGame = ({
	leaderboard_address,
	user_address,
}: Props) => {
	const currentBlockNumber = useBlockNumber();
	const { currentGame, currentGameLevelCompleted } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	const [timeRemaining, setTimeRemaining] = useState<{
		hours: number;
		minutes: number;
	} | null>(null);

	const endsAtBlock = currentGame.data?.endsAtBlock || 0;

	useEffect(() => {
		if (endsAtBlock > 0 && currentBlockNumber.data) {
			const blocksRemaining =
				Number(endsAtBlock) - Number(currentBlockNumber.data);
			const secondsRemaining = blocksRemaining * 12;
			const hours = secondsRemaining / 3600;
			const minutes = Math.floor(secondsRemaining / 60);

			setTimeRemaining({
				hours: Math.floor(hours),
				minutes,
			});
		}
	}, [endsAtBlock, currentBlockNumber.data]);

	return (
		<div className="w-full">
			<div className="flex flex-col gap-8 w-full">
				{currentGame.isLoading ? (
					"Loading..."
				) : currentGame.gamesHaveFinished ? (
					<p className="text-lg text-text-100">
						There are no more games available to play...
					</p>
				) : (
					<>
						<p className="text-lg text-text-100">
							Your progress on current active game:
						</p>

						<div className="flex items-center w-full overflow-scroll">
							<div
								className="w-full relative"
								style={{ width: 1000 }}
							>
								<div className="relative w-full flex gap-2 justify-between">
									{Array.from(
										{ length: 8 },
										(_, i) => i + 1
									).map(i => (
										<LevelComponent
											key={i}
											level_number={i}
											claimed={
												i <=
												Number(
													currentGameLevelCompleted.data ||
														0
												)
											}
											points={1}
										/>
									))}
								</div>
							</div>
						</div>

						<p className="text-lg text-text-200 text-center">
							Levels renew in{" "}
							{timeRemaining ? (
								<span className="text-accent-100">
									{timeRemaining.hours > 0
										? `${timeRemaining.hours} hours`
										: `${timeRemaining.minutes} minutes`}
								</span>
							) : (
								<span className="text-accent-100">
									loading...
								</span>
							)}
						</p>
					</>
				)}
			</div>
		</div>
	);
};
