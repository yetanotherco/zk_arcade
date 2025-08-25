import React, { useState } from "react";
import { ParityBoard } from "./Board";
import { Button } from "../../components";
import { useParityControls } from "./useParityControls";
import { ParityGameState } from "./types";
import { useSwapTransition } from "./useSwapTransition";
import { generateCircomParityProof } from "./GenerateProof";
import { SubmitProofModal } from "../../components/Modal/SubmitProof";
import { useModal } from "../../hooks/useModal";
import { Address } from "viem";
import { VerificationData } from "../../types/aligned";

const tutorialText = [
	{
		text: "Parity is a numbers puzzle game. The aim of the game is to get each number on a 3x3 board of numbers to be exactly the same.",
		button: "Okay...",
	},
	{
		text: "One of the numbers is always selected. This number can be moved by using WASD",
		button: "Sounds easy",
	},
	{
		text: "Each time you move the selector, the number you select will increase in number by one.",
		button: "I got this!",
	},
];

const TutorialText = ({
	header = "How to play",
	text,
	button,
	onClick,
}: {
	header?: string;
	text: string;
	button: string;
	onClick: () => void;
}) => {
	return (
		<div className="flex flex-col items-center justify-center gap-10 w-full max-w-[500px]">
			<h1 className="text-3xl font-normal">{header}</h1>
			<p className="text-center text-text-200 text-lg">{text}</p>
			<Button variant="arcade" onClick={onClick}>
				{button}
			</Button>
		</div>
	);
};

const BoardTutorial = ({
	setGameState,
	gameProps
}: {
	setGameState: (state: ParityGameState) => void;
		gameProps: GameProps;
}) => {
	const { positionIdx, values, hasWon, reset, userPositions, levelBoards } = useParityControls({
		initialPosition: { col: 0, row: 0 },
		initialValues: [1, 0, 0, 1, 1, 0, 1, 1, 0],
	});
	const { open, setOpen, toggleOpen } = useModal();
	const [proofVerificationData, setProofVerificationData] = useState<VerificationData | null>(null);

	const generateproofVerificationData = async () => {
		const submitproofVerificationData = await generateCircomParityProof({
			user_address: gameProps.user_address,
			userPositions: userPositions,
			levelBoards: levelBoards,
		});

		setProofVerificationData(submitproofVerificationData);
		setOpen(true);
	};

	const view = useSwapTransition(hasWon, (_, won) =>
		won ? (

			<div className="flex flex-col gap-2">
				<TutorialText
					header="End of tutorial"
					text="You have completed the tutorial. Now that you understand how the game works, you are ready to prove it to others and climb the leaderboard."
					button="Let's go!"
					onClick={() => setGameState("home")}
				/>				

				<Button
					onClick={generateproofVerificationData}
					variant="arcade"
				>
					Generate Proof
				</Button>

				<SubmitProofModal
					modal={{ open, setOpen }}
					batcher_url={gameProps.batcher_url}
					leaderboard_address={gameProps.leaderboard_address}
					payment_service_address={gameProps.payment_service_address}
					user_address={gameProps.user_address}
					userBeastSubmissions={[]}
					proofToSubmitData={proofVerificationData}
					gameName="parity"
				/>

			</div>
		) : (
			<ParityBoard
				values={values}
				positionIdx={positionIdx}
				levelNumber={1}
				totalLevels={1}
				reset={reset}
			/>
		)
	);

	return view;
};

type GameProps = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	leaderboard_address: Address;
	batcher_url: string;
};

export const ParityTutorial = ({
	setGameState,
	gameProps
}: {
	setGameState: (state: ParityGameState) => void;
	gameProps: GameProps;
}) => {
	const [step, setStep] = useState(0);

	const goToNextStep = () => {
		setStep(prev => prev + 1);
	};

	return (
		<div className="w-full h-full flex flex-col gap-4 items-center">
			<h2 className="text-2xl font-normal text-center">Tutorial</h2>
			<div className="w-full h-full flex justify-center items-center">
				{tutorialText[step] ? (
					<TutorialText
						text={tutorialText[step].text}
						button={tutorialText[step].button}
						onClick={goToNextStep}
					/>
				) : (
					<BoardTutorial setGameState={setGameState} gameProps={gameProps} />
				)}
			</div>
		</div>
	);
};
