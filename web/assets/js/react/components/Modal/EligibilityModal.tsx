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
									Minting this NFT proves your eligibility and
									unlocks access to ZK Arcade.
								</div>
							</div>
						</div>
						<div className="flex mt-4 gap-8 justify-center items-center text-center">
							<Button variant="text" onClick={dismiss}>
								Do it later
							</Button>
							<Button
								variant="accent-fill"
								onClick={() => {
									window.location.href = "/mint";
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
								Mint the NFT to Join
							</h3>
							<p className="text-text-100 text-center">
								You can mint the NFT now and start playing.
							</p>
						</div>
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
									Minting this NFT proves your eligibility and
									unlocks access to claim points in ZK Arcade.
								</div>
							</div>
						</div>
						<div className="flex mt-4 gap-8 justify-center items-center text-center">
							<Button variant="text" onClick={dismiss}>
								Maybe later
							</Button>
							<Button
								variant="accent-fill"
								onClick={() => {
									window.location.href = "/nft/mint";
								}}
							>
								Mint NFT
							</Button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};
