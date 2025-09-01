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
	renewsIn,
	currentGameConfig,
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
	nft_contract_address,
}: {
	renewsIn: Date;
	currentGameConfig: string;
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
	nft_contract_address: Address;
}) => {
	const [proofVerificationData, setProofVerificationData] = useState<VerificationData | null>(null);
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
						{renewsIn.getHours()} hours
					</span>{" "}
					for new levels!
				</p>
			</div>
			<Button variant="arcade" onClick={() => generateproofVerificationData()}>
				Generate Proof
			</Button>
			<SubmitProofModal
				modal={{ open, setOpen }}
				batcher_url={batcher_url}
				leaderboard_address={leaderboard_address}
				payment_service_address={payment_service_address}
				user_address={user_address}
				userBeastSubmissions={[]}
				proofToSubmitData={proofVerificationData}
				gameName="parity"
				nft_contract_address={nft_contract_address}
			/>
		</div>
	);
};
