import React, { useEffect } from "react";
import { useModal } from "../hooks";
import { Modal } from "../components/Modal";
import { Button } from "../components";

export const HowItWorksModal = () => {
	const { open, setOpen } = useModal();

	const setAsViewed = () => {
		localStorage.setItem("how-it-works-viewed", "true");
	};

	useEffect(() => {
		const viewed = JSON.parse(
			localStorage.getItem("how-it-works-viewed") || "false"
		);
		if (!viewed) {
			setOpen(true);
		}

		document
			.querySelectorAll("#how-it-works-nav-btn")
			.forEach(el => el.addEventListener("click", () => setOpen(true)));
	}, [setOpen]);

	const steps = [
		{
			title: "Connect your wallet",
			description:
				"Link your crypto wallet to start playing. This ensures your rewards and transactions are tied securely to your account.",
		},
		{
			title: "Deposit money on Aligned",
			description:
				"Add funds to Aligned so you can submit and verify your proofs.",
		},
		{
			title: "Play a game & generate zk proof",
			description:
				"Complete the challenge in the game. Once solved, a zero-knowledge proof is generated to confirm your achievement.",
		},
		{
			title: "Submit your proof for verification",
			description:
				"Send your solution proof to the Aligned verification system to confirm it’s valid.",
		},
		{
			title: "Claim your points",
			description:
				"Once your proof is verified, claim the points you’ve earned for your successful challenge.",
		},
		{
			title: "Play daily & climb the leaderboard",
			description:
				"Join daily challenges to keep earning points and compete for the top leaderboard positions.",
		},
	];

	return (
		<div>
			<Modal
				open={open}
				setOpen={setOpen}
				maxWidth={1000}
				onClose={setAsViewed}
			>
				<div className="bg-contrast-100 w-full p-10 rounded flex flex-col gap-8 max-h-[90vh]">
					<div className="text-center">
						<h3 className="text-3xl font-bold mb-2">
							How It Works
						</h3>
						<p className="text-text-200">
							Hi! Here are the instructions on how to use
							zk-arcade
						</p>
					</div>
					<div className="flex flex-col gap-6 overflow-scroll">
						{steps.map((step, index) => (
							<div key={index} className="flex items-start gap-4">
								<div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-black font-bold">
									{index + 1}
								</div>
								<div>
									<h3 className="text-lg  text-text-100">
										{step.title}
									</h3>
									<p className="text-sm text-text-200">
										{step.description}
									</p>
								</div>
							</div>
						))}
					</div>
					<Button
						variant="accent-fill"
						onClick={() => setOpen(false)}
						className="mt-6"
					>
						Got it!
					</Button>
				</div>
			</Modal>
		</div>
	);
};
