import React, { useState } from "react";
import { ParityBoard } from "./Board";
import { Button } from "../../components";
import { useParityControls } from "./useParityControls";
import { ParityGameState } from "./types";
import { useSwapTransition } from "./useSwapTransition";

const tutorialText = [
	{
		text: "Parity is a numbers puzzle game. The aim of the game is to get each number on a 3x3 board of numbers to be exactly the same.",
		button: "Okay...",
	},
	{
		text: "One number is always highlighted. You can move the highlight with WASD keys or by clicking a neighboring tile.",
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

const BoardTutorial = ({ goHome }: { goHome: () => void }) => {
	const { positionIdx, values, userPositions, hasWon, reset, updatePos } =
		useParityControls({
			initialPosition: { col: 0, row: 0 },
			initialValues: [1, 0, 0, 1, 1, 0, 1, 1, 0],
		});

	const view = useSwapTransition(hasWon, (_, won) =>
		won ? (
			<TutorialText
				header="End of tutorial"
				text="You have completed the tutorial. Now that you understand how the game works, you are ready to prove it to others and climb the leaderboard."
				button="Let's go!"
				onClick={() => {
					goHome();
				}}
			/>
		) : (
			<ParityBoard
				values={values}
				positionIdx={positionIdx}
				levelNumber={1}
				totalLevels={1}
				reset={reset}
				user_positions={userPositions}
				home={() => goHome()}
				updatePos={updatePos}
			/>
		)
	);

	return view;
};

export const ParityTutorial = ({
	setGameState,
	setHasPlayedTutorial,
}: {
	setGameState: (state: ParityGameState) => void;
	setHasPlayedTutorial: (played: boolean) => void;
}) => {
	const [step, setStep] = useState(0);

	const goToNextStep = () => {
		setStep(prev => prev + 1);
	};

	const goHome = () => {
		localStorage.setItem("parity-tutorial-played", "true");
		setGameState("home");
		setHasPlayedTutorial(true);
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
					<BoardTutorial goHome={goHome} />
				)}
			</div>
		</div>
	);
};
