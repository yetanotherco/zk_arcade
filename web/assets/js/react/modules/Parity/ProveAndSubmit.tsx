import React, { useState } from "react";
import { Button } from "../../components";
import { useSwapTransition } from "./useSwapTransition";
import { generateCircomParityProof } from "./GenerateProof";
import { VerificationData } from "../../types/aligned";
import { Address } from "viem";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";

export const ProveAndSubmit = ({
	goToNextLevel,
	levelBoards,
	userPositions,
	user_address,
	payment_service_address,
	batcher_url,
	leaderboard_address,
}: {
	goToNextLevel: () => void;
	levelBoards: number[][];
	userPositions: [number, number][];
	user_address: Address;
	payment_service_address: Address;
	batcher_url: string;
	leaderboard_address: Address;
}) => {
	const [proofGenerated, setProofGenerated] = useState(false);

	const [proofVerificationData, setProofVerificationData] = useState<VerificationData | null>(null);
	const [open, setOpen] = useState(false);

	const generateproofVerificationData = async () => {
		const totalLevelBoards = [[...levelBoards]];
		const totalUserPositions = [[...userPositions]];

		const submitproofVerificationData = await generateCircomParityProof({
			user_address: user_address,
			userPositions: totalUserPositions,
			levelsBoards: totalLevelBoards,
		});

		setProofVerificationData(submitproofVerificationData);
		setOpen(true);
	};

	// TODO: Change this swap logic for a two button menu offering generate the proof for the current
	// progress or keep playing
	const view = useSwapTransition(proofGenerated, (_, proven) =>
		proven ? (
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Level completed and proven
						</h2>
						<p className="text-text-200 text-center">
							You have completed this level and submitted the
							proof you can continue with the next level.
						</p>
					</div>
					<div className="flex flex-col gap-5 items-center justify-center w-full">
						<Button
							variant="arcade"
							className="max-w-[300px] w-full"
							onClick={goToNextLevel}
						>
							Next Level
						</Button>
					</div>
				</div>
			</div>
		) : (
			<div className="w-full h-full flex flex-col gap-4 items-center max-w-[500px]">
				<div className="h-full w-full flex flex-col gap-10 items-center justify-center">
					<div>
						<h2 className="text-2xl mb-2 font-normal text-center">
							Prove Execution
						</h2>
						<p className="text-text-200 text-center">
							Prove the completion of the level and submit it to
							Aligned to claim points
						</p>
					</div>
					<Button
						variant="arcade"
						className="max-w-[300px] w-full"
						onClick={() => {
							generateproofVerificationData();
						}}
					>
						Generate Proof
					</Button>
				</div>
			</div>
		)
	);

	return (
		<div>
			{view}
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
