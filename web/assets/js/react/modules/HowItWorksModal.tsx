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
		},
		{
			title: "Check eligibility",
		},
		{
			title: "Deposit money on Aligned to pay for proof verification",
		},
		{
			title: "Play a game and generate a zk proof",
		},
		{
			title: "Submit your proof for verification",
		},
		{
			title: "Claim your points",
		},
		{
			title: "Play and climb the leaderboard",
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
					</div>
					<div className="flex flex-col gap-6 overflow-scroll">
						{steps.map((step, index) => (
							<div key={index} className="flex items-center gap-4">
								<div className="flex-shrink-0 w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center text-black font-bold">
									{index + 1}
								</div>
								<div>
									<h3 className="text-lg  text-text-100">
										{step.title}
									</h3>
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
