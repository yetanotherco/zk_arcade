import React, { useState } from "react";
import { Button } from "../../components";
import { generateCircomParityProof } from "./GenerateProof";
import { VerificationData } from "../../types/aligned";
import { Address } from "viem";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { ParityGameState } from "./types";

type GameStatus = {
	levelsBoards: number[][][];
	userPositions: [number, number][][];
};

export const ProveAndSubmit = ({
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
	currentGameConfig,
	setGameState,
}: {
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	currentGameConfig: string;
	setGameState: (state: ParityGameState) => void;
}) => {
	const [open, setOpen] = useState(false);
	const [proofVerificationData, setProofVerificationData] =
		useState<VerificationData | null>(null);
	const [userGameData, _setUserGameData] = useState<GameStatus>(() => {
		const stored = localStorage.getItem("parity-game-data");

		const gameData: { [key: string]: GameStatus } = stored
			? JSON.parse(stored)
			: {};

		return (
			gameData[currentGameConfig] || {
				levelsBoards: [],
				userPositions: [],
			}
		);
	});

	const generateproofVerificationData = async () => {
		const submitproofVerificationData = await generateCircomParityProof({
			user_address,
			userPositions: userGameData.userPositions,
			levelsBoards: userGameData.levelsBoards,
		});

		setProofVerificationData(submitproofVerificationData);
		setOpen(true);
	};

	return (
		<div>
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Prove your playthrough
						</h2>
						<p className="text-text-200 text-center">
							{userGameData.levelsBoards.length
								? `Prove you have completed up to level ${userGameData.levelsBoards.length}`
								: `Prove you have completed the game`}
						</p>
					</div>
					<div className="flex flex-col gap-5 w-full max-w-[300px]">
						<Button
							variant="arcade"
							className="w-full"
							onClick={() => {
								generateproofVerificationData();
							}}
						>
							Generate Proof
						</Button>
						<Button
							variant="arcade"
							className="w-full"
							onClick={() => {
								setGameState("home");
							}}
						>
							Home
						</Button>
					</div>
				</div>
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
