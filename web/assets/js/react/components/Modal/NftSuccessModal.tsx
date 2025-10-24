import React from "react";
import { Modal } from "./Modal";
import { NftMetadata } from "../../hooks/useNftContract";

type Props = {
	open: boolean;
	setOpen: (open: boolean) => void;
	nftMetadata: NftMetadata | null;
	onClose?: () => void;
};

const NftSuccessContent = ({ nftMetadata }: { nftMetadata: NftMetadata }) => {
	const shareOnX = async () => {
		const text = encodeURIComponent(
			"I just minted my ZK Arcade Ticket NFT! Sending proofs to @alignedlayer soon ✅\n\n"
		);
		const url = encodeURIComponent(
			"Check if you are eligible: https://zkarcade.com/mint\n\n"
		);
		const hashtags = `\naligned,zkarcade,nft,zk`;
		const twitterShareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;

		window.open(twitterShareUrl, "_blank");

		return;
	};

	return (
		<div className="flex flex-col items-center gap-6 max-w-md text-center">
			<div className="relative w-44 overflow-hidden rounded-2xl bg-gradient-to-br from-black via-[#0b0b0d] to-[#040404] p-3 shadow-[0_35px_85px_-35px_rgba(24,255,127,0.9)] ring-1 ring-accent-100/45">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(24,255,127,0.35),transparent_72%)] opacity-80 blur-sm" />
				<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(24,255,127,0.24),transparent_50%)] opacity-70 mix-blend-screen" />
				<div className="pointer-events-none absolute -inset-x-16 top-1/3 h-64 bg-[radial-gradient(circle,rgba(24,255,127,0.4),transparent_70%)] opacity-50 blur-3xl" />
				<div className="relative overflow-hidden rounded-xl bg-black shadow-[0_25px_60px_-32px_rgba(24,255,127,0.55)]">
					{nftMetadata.image ? (
						<img
							src={nftMetadata.image}
							alt={nftMetadata.name || "NFT"}
							title={nftMetadata.name || undefined}
							className="aspect-square w-full object-cover"
						/>
					) : (
						<div className="grid aspect-square w-full place-items-center text-sm text-accent-100/70 backdrop-blur-sm">
							Image unavailable
						</div>
					)}
				</div>
				<div className="pointer-events-none absolute -bottom-10 left-1/2 h-16 w-48 -translate-x-1/2 rounded-full bg-accent-100/25 blur-xl" />
				<div className="absolute inset-0 animate-pulse rounded-2xl border border-accent-100/20" />
			</div>

			<div className="flex flex-col gap-2">
				<h3 className="text-2xl font-semibold text-white drop-shadow-[0_4px_20px_rgba(24,255,127,0.35)]">
					{nftMetadata.name || "Untitled NFT"}
				</h3>
				<p className="text-text-100 text-sm leading-relaxed">
					{nftMetadata.description ||
						"This NFT does not include a description."}
				</p>
				<div className="mt-3 inline-flex items-center justify-center gap-2 rounded bg-accent-100/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-accent-100/90 shadow-[0_12px_35px_-22px_rgba(24,255,127,0.9)] ring-1 ring-accent-100/25">
					<span className="inline-block h-2 w-2 animate-ping rounded-full bg-accent-100/70" />
					Token #{Number(nftMetadata.tokenId || 0n)}
				</div>
				<button
					type="button"
					onClick={shareOnX}
					className="mt-5 inline-flex items-center justify-center gap-2 rounded bg-accent-100 px-5 py-2 text-sm font-semibold text-black transition hover:bg-accent-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-100/50"
					aria-label="Share on X"
				>
					<svg
						className="h-4 w-4"
						viewBox="0 0 1200 1227"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						aria-hidden="true"
					>
						<path d="M714.163 519.284 1160.89 0H1055.03L667.137 450.887 357.328 0H0L468.492 681.821 0 1226.37H105.866L515.236 747.525 842.672 1226.37H1200L714.137 519.284h.026Zm-182.109 211.7-47.51-67.92L172.352 80.14h162.551l305.806 437.655 47.51 67.92 342.638 490.072H868.306L532.054 730.985Z" />
					</svg>
					<span>Share on X</span>
				</button>
			</div>
		</div>
	);
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
			<div className="relative flex flex-col items-center gap-7 overflow-hidden rounded-3xl bg-gradient-to-b from-[#050607] via-[#08090a] to-black p-10 shadow-[0_55px_120px_-40px_rgba(24,255,127,0.65)] ring-1 ring-accent-100/25">
				<div className="pointer-events-none absolute inset-0 opacity-70">
					<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(24,255,127,0.22),transparent_70%)]" />
					<div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(24,255,127,0.18),transparent_45%)] mix-blend-screen" />
				</div>
				<div className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_bottom,rgba(24,255,127,0.12),transparent_80%)] opacity-55" />
				<div className="pointer-events-none absolute inset-x-10 top-0 h-1 bg-gradient-to-r from-transparent via-accent-100/60 to-transparent opacity-70" />
				<div className="pointer-events-none absolute -bottom-14 h-32 w-[75%] rounded-full bg-accent-100/15 blur-3xl" />

				<div className="text-center">
					<h2 className="text-3xl font-semibold text-accent-100 drop-shadow-[0_10px_35px_rgba(24,255,127,0.35)] mb-3">
						Claim Complete
					</h2>
					<p className="text-text-100 text-sm leading-relaxed">
						Your access pass just hit the chain. Bask in the glow
						while we tee up what’s next.
					</p>
				</div>

				<NftSuccessContent nftMetadata={nftMetadata} />
			</div>
		</Modal>
	);
};
