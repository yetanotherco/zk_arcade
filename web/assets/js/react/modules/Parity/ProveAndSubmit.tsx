import React, { useState } from "react";
import { Button } from "../../components";
import { useSwapTransition } from "./useSwapTransition";

export const ProveAndSubmit = ({
	goToNextLevel,
}: {
	goToNextLevel: () => void;
}) => {
	const [proofGenerated, setProofGenerated] = useState(false);

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
							setProofGenerated(true);
						}}
					>
						Generate Proof
					</Button>
				</div>
			</div>
		)
	);

	return view;
};
