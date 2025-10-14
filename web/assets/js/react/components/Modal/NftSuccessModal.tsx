import React from "react";
import { Modal } from "./Modal";
import { Button } from "..";
import { NftMetadata } from "../../hooks/useNftContract";

type Props = {
	open: boolean;
	setOpen: (open: boolean) => void;
	nftMetadata: NftMetadata | null;
	onClose?: () => void;
};

export const NftSuccessModal = ({
	open,
	setOpen,
	nftMetadata,
	onClose,
}: Props) => {
	const dismiss = () => {
		setOpen(false);
		onClose && onClose();
	};

	if (!nftMetadata) return null;

	return (
		<Modal
			open={open}
			setOpen={setOpen}
			maxWidth={600}
			shouldCloseOnEsc={true}
			shouldCloseOnOutsideClick={true}
			showCloseButton={true}
			onClose={dismiss}
		>
			<div className="bg-contrast-100 p-8 rounded flex flex-col items-center gap-6">
				<div className="text-center">
					<h2 className="text-2xl font-bold text-green-400 mb-2">
						NFT Claimed Successfully!
					</h2>
					<p className="text-text-100">
						Your NFT has been minted and confirmed on-chain.
					</p>
				</div>

				<div className="flex flex-col items-center gap-4 max-w-md">
					<div className="relative group">
						<img
							src={nftMetadata.image}
							alt={nftMetadata.name}
							className="w-48 h-48"
						/>
					</div>

					<div className="text-center">
						<h3 className="text-xl font-semibold text-white mb-2">
							{nftMetadata.name}
						</h3>
						<p className="text-text-100 text-sm leading-relaxed">
							{nftMetadata.description}
						</p>
					</div>
				</div>
			</div>
		</Modal>
	);
};
