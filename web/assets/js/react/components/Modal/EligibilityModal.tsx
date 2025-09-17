import React from "react";
import { useNftContract } from "../../hooks/useNftContract";
import { Modal } from "../../components/Modal";
import { Button } from "../../components";
import { Address } from "../../types/blockchain";

type Props = {
	user_address: Address;
	nft_contract_address: Address;
	isEligible: boolean;
	open: boolean;
	setOpen: (open: boolean) => void;
	onClose?: () => void;
};

export const EligibilityModal = ({
	user_address,
	nft_contract_address,
	isEligible,
	onClose,
	open,
	setOpen,
}: Props) => {
	const { balance, claimNft, receipt } = useNftContract({
		userAddress: user_address,
		contractAddress: nft_contract_address,
	});

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
								isLoading={receipt.isLoading}
								disabled={balance.data !== 0n}
							>
								Mint
							</Button>
						</div>
					</>
				) : (
					<>
						<h3 className="text-xl font-semibold text-center">
							Not eligible yet
						</h3>
						<p className="text-text-100 text-center">
							This wallet isn’t eligible to participate right now.
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
