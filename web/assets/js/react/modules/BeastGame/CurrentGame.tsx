import React from "react";
import { Address } from "../../types/blockchain";
import { useLeaderboardContract } from "../../hooks/useLeaderboardContract";

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
	const { currentGame, currentGameLevelCompleted } = useLeaderboardContract({
		contractAddress: leaderboard_address,
		userAddress: user_address,
	});

	return (
		<div className="w-full">
			<div className="flex flex-col gap-8 w-full">
				<p className="text-lg text-text-100">
					Your progress on current active game:
				</p>
				<div className="flex items-center w-full overflow-scroll">
					<div className="w-full relative" style={{ width: 1000 }}>
						<div className="relative w-full flex gap-2 justify-between">
							{Array.from({ length: 8 }, (_, i) => i).map(i => (
								<LevelComponent
									level_number={i + 1}
									claimed={false}
									points={1}
								/>
							))}
						</div>
					</div>
				</div>

				<p className="text-lg text-text-200 text-center">
					Levels renew in{" "}
					<span className="text-accent-100">6 hours</span>
				</p>
			</div>
		</div>
	);
};
