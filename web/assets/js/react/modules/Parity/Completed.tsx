import React, { useState } from "react";
import { ParityGameState } from "./types";
import { Button } from "../../components";
import { generateCircomParityProof } from "./GenerateProof";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { Address } from "viem";
import { VerificationData } from "../../types/aligned";

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const Completed = ({
	timeRemaining,
	currentGameConfig,
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
	setGameState,
}: {
	timeRemaining: {
		hours: number;
		minutes: number;
	} | null;
	currentGameConfig: string;
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	setGameState: (state: ParityGameState) => void;
}) => {
	const [proofVerificationData, setProofVerificationData] =
		useState<VerificationData | null>(null);
	const [open, setOpen] = useState(false);

	const generateproofVerificationData = async () => {
		const stored = localStorage.getItem("parity-game-data");

		const gameData: { [key: string]: GameStatus } = stored
			? JSON.parse(stored)
			: {};

		const currentLevelReached: GameStatus = gameData[currentGameConfig] || {
			levelsBoards: [],
			userPositions: [],
		};

		const submitproofVerificationData = await generateCircomParityProof({
			user_address,
			userPositions: currentLevelReached.userPositions,
			levelsBoards: currentLevelReached.levelsBoards,
		});

		setProofVerificationData(submitproofVerificationData);
		setOpen(true);
	};

	return (
		<div className="w-full h-full flex flex-col gap-10 justify-center items-center">
			<div>
				<h2 className="text-2xl mb-2 font-normal text-center">
					Game completed
				</h2>
				<p className="text-text-200 text-center">
					You have completed the full game, come in{" "}
					<span className="text-accent-100">
						{timeRemaining ? (
							<span className="text-accent-100">
								{timeRemaining.hours > 0
									? `${timeRemaining.hours} hours`
									: `${timeRemaining.minutes} minutes`}
							</span>
						) : (
							<span className="text-accent-100">loading...</span>
						)}
					</span>{" "}
					for new levels!
				</p>
			</div>
			<div className="flex flex-col gap-5 w-full max-w-[300px]">
				<Button
					variant="arcade"
					onClick={() => generateproofVerificationData()}
				>
					Generate Proof
				</Button>
				<Button variant="arcade" onClick={() => setGameState("home")}>
					Home
				</Button>
			</div>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				userBeastSubmissions={[]}
				proofToSubmitData={proofVerificationData}
				gameName="parity"
			/>
		</div>
	);
};
