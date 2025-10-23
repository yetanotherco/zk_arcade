import React from "react";
import { Modal } from "../../components/Modal";
import { Button } from "../../components";

type Props = {
	isEligible: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	onClose?: () => void;
	claimNft: () => Promise<`0x${string}` | void>;
	isLoading: boolean;
	balance: BigInt;
};

export const EligibilityModal = ({
	isEligible,
	claimNft,
	isLoading,
	balance,
	onClose,
	open,
	setOpen,
}: Props) => {
	const dismiss = () => {
		setOpen(false);
		onClose && onClose();
	};

	return (
		<Modal
			open={open}
			setOpen={setOpen}
			maxWidth={560}
			shouldCloseOnEsc={false}
			shouldCloseOnOutsideClick={false}
			showCloseButton={false}
		>
			<div className="bg-contrast-100 p-10 rounded flex flex-col gap-6">
				{isEligible ? (
					<>
						<h3 className="text-xl font-semibold text-center">
							You’re eligible 🎉
						</h3>
						<p className="text-text-100 text-center">
							Your wallet is eligible to play and claim rewards.
							Have fun!
						</p>
						<div className="flex w-full justify-center relative group">
							<span className="text-white text-sm underline cursor-help">
								What is this?
							</span>
							<div className="absolute top-full transform  translate-y-2 hidden group-hover:block z-10">
								<div
									className="bg-white text-black text-sm rounded shadow-lg px-6 py-4
															opacity-0 group-hover:opacity-100 transition-opacity duration-200 
															break-words whitespace-normal max-w-sm min-w-[400px] pointer-events-none"
								>
									Minting this free NFT proves your
									eligibility and unlocks access to ZK Arcade.
									It acts as your participation ticket,
									letting you submit proofs and earn points on
									the leaderboard. You only need to mint it
									once.
								</div>
							</div>
						</div>
						<div className="flex mt-4 gap-8 justify-center items-center text-center">
							<Button variant="text" onClick={dismiss}>
								Do it later
							</Button>
							<Button
								variant="accent-fill"
								onClick={async () => {
									await claimNft();
									dismiss();
								}}
								isLoading={isLoading}
								disabled={balance !== 0n}
							>
								Mint
							</Button>
						</div>
					</>
				) : (
					<>
						<div>
							<h3 className="text-xl mb-1 font-semibold text-center">
								You are not eligible yet,
								<br />
								but don't worry
							</h3>
							<p className="text-text-100 text-center">
								More waves are incoming
							</p>
						</div>
						<p className="text-text-200 text-center text-sm leading-relaxed">
							Follow{" "}
							<a
								href="https://x.com/alignedlayer"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-100 hover:underline"
							>
								Aligned on X
							</a>
							, subscribe to our{" "}
							<a
								href="https://blog.alignedlayer.com/"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-100 hover:underline"
							>
								newsletter
							</a>
							, and join the{" "}
							<a
								href="https://discord.gg/alignedlayer"
								target="_blank"
								rel="noopener noreferrer"
								className="text-accent-100 hover:underline"
							>
								Discord
							</a>{" "}
							to hear when the next wave of access opens up.
						</p>
						<div className="flex w-full justify-center relative group">
							<span className="text-white text-sm underline cursor-help">
								What is this?
							</span>
							<div className="absolute top-full transform  translate-y-2 hidden group-hover:block z-10">
								<div
									className="bg-white text-black text-sm rounded shadow-lg px-6 py-4
															opacity-0 group-hover:opacity-100 transition-opacity duration-200 
															break-words whitespace-normal max-w-sm min-w-[400px] pointer-events-none"
								>
									This NFT acts as your participation ticket
									for ZK Arcade, linking your wallet to the
									game so you can earn points on the
									leaderboard. Your wallet isn’t eligible to
									mint right now, but keep an eye out for
									upcoming campaigns where you may qualify.
								</div>
							</div>
						</div>
						<div className="text-center mt-4">
							<Button variant="accent-fill" onClick={dismiss}>
								Ok
							</Button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};
