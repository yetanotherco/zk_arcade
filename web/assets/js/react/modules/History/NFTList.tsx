import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { Modal } from "../../components";
import {
	NftMetadata,
	getNftMetadata,
	useNftContract,
} from "../../hooks/useNftContract";

type Props = {
	network: string;
	user_address: Address;
	nft_contract_address: Address;
	is_eligible: string;
};

const NFTView = ({
	nft_metadata,
	openNFTModal,
	setOpenNFTModal,
}: {
	nft_metadata: NftMetadata | null;
	openNFTModal: boolean;
	setOpenNFTModal: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
	if (!nft_metadata) return null;

	return (
		<>
			<Modal open={openNFTModal} setOpen={setOpenNFTModal} maxWidth={900}>
				<div className="relative w-full max-h-[80vh] overflow-hidden rounded-2xl bg-black shadow-[0_35px_95px_-32px_rgba(0,0,0,0.8)] before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(24,255,127,0.18),transparent_65%)] before:opacity-70 after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(24,255,127,0.12),transparent_45%)] after:opacity-65">
					<div className="relative flex h-full flex-col md:flex-row">
						<div className="flex justify-center bg-black/55 p-8 backdrop-blur-sm md:backdrop-blur md:w-[320px] md:flex-none">
							<div className="grid w-full max-w-[240px] place-items-center">
								<div className="group relative aspect-square w-full overflow-hidden rounded-2xl bg-gradient-to-br from-black via-black to-[#111] ring-1 ring-accent-100/20">
									<div className="pointer-events-none absolute inset-0 translate-y-[55%] scale-[1.5] bg-[radial-gradient(ellipse_at_top_left,rgba(24,255,127,0.18),transparent_78%)] opacity-0 transition-opacity duration-500 group-hover:opacity-55" />
									<div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(24,255,127,0.2),transparent_60%)] mix-blend-screen opacity-0 transition-opacity duration-500 group-hover:opacity-75" />
									<img
										src={nft_metadata?.image}
										alt={nft_metadata?.name || "NFT"}
										title={nft_metadata?.name}
										className="relative z-10 h-full w-full object-contain drop-shadow-[0_25px_45px_rgba(24,255,127,0.25)] transition-transform duration-500 group-hover:scale-[1.02]"
									/>
								</div>
							</div>
						</div>

						<div className="flex flex-1 flex-col gap-8 overflow-y-auto p-10">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<h1 className="text-2xl font-semibold text-text-100">
									{nft_metadata.name || "Untitled NFT"}
								</h1>
								<div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.3em] text-accent-100/80">
									<span className="inline-block h-2 w-2 rounded-full bg-accent-100/70" />
									Token #{Number(nft_metadata.tokenId || 0n)}
								</div>
							</div>

							<p className="leading-relaxed text-text-200">
								{nft_metadata.description ||
									"This NFT does not include a description."}
							</p>

							<div className="grid gap-6 text-sm text-text-200 md:grid-cols-2">
								<div className="flex flex-col gap-2 rounded-xl bg-black/60 p-4 shadow-[0_10px_24px_rgba(24,255,127,0.04)] ring-1 ring-accent-100/10">
									<span className="text-xs uppercase tracking-[0.3em] text-text-200/80">
										Token ID
									</span>
									<span className="text-lg font-medium text-text-100">
										{Number(nft_metadata.tokenId || 0n)}
									</span>
								</div>

								<div className="flex flex-col gap-2 rounded-xl bg-black/60 p-4 shadow-[0_10px_24px_rgba(24,255,127,0.04)] ring-1 ring-accent-100/10">
									<span className="text-xs uppercase tracking-[0.3em] text-text-200/80">
										Contract Address
									</span>
									<a
										className="break-all text-base font-medium text-text-100 transition-colors hover:text-accent-100"
										href={`https://etherscan.io/address/${nft_metadata.address}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										{nft_metadata.address}
									</a>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Modal>
		</>
	);
};

const NFTCard = ({
	metadata,
	index,
	onSelect,
}: {
	metadata: NftMetadata;
	index: number;
	onSelect: (metadata: NftMetadata) => void;
}) => {
	return (
		<button
			type="button"
			onClick={() => onSelect(metadata)}
			className="group relative flex w-full max-w-[300px] flex-col overflow-hidden rounded-xl bg-black/75 p-3 text-left shadow-[0_18px_45px_-35px_rgba(24,255,127,0.8)] transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-100/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(24,255,127,0.2),transparent_65%)] before:opacity-55 before:transition-opacity before:duration-300 after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(24,255,127,0.16),transparent_45%)] after:opacity-35 after:transition-opacity after:duration-300 hover:before:opacity-85 hover:after:opacity-60"
		>
			<div className="relative z-10 flex flex-col gap-3">
				<div className="relative mx-auto w-full max-w-[90px] overflow-hidden rounded-xl bg-gradient-to-br from-black via-[#0b0b0d] to-[#040404] ring-[0.5px] ring-accent-100/35">
					{metadata.image ? (
						<img
							src={metadata.image}
							alt={metadata.name || "NFT"}
							title={metadata.name || undefined}
							className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]"
						/>
					) : (
						<div className="grid aspect-square w-full place-items-center text-sm text-accent-100/70">
							Image unavailable
						</div>
					)}
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(24,255,127,0.28),transparent_75%)] opacity-0 transition-opacity duration-300 group-hover:opacity-60" />
				</div>

				<div className="flex flex-col gap-1.5">
					<div className="flex items-start justify-between gap-2">
						<h3 className="max-w-[68%] truncate text-xs font-semibold uppercase tracking-[0.24em] text-text-100">
							{metadata.name || `NFT #${index + 1}`}
						</h3>
						<span className="rounded-full bg-accent-100/10 px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-[0.3em] text-accent-100/80">
							View
						</span>
					</div>

					<div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.28em] text-text-200/70">
						<span className="inline-block h-1 w-1 rounded-full bg-accent-100/70" />
						Token #{Number(metadata.tokenId || 0n)}
					</div>
				</div>
			</div>
		</button>
	);
};

const NFTList = ({
	is_eligible,
	nft_contract_address,
	user_address,
}: Omit<Props, "network">) => {
	const { balance, tokenURIs } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});

	const [nftMetadataList, setNftMetadataList] = useState<NftMetadata[]>([]);

	const [openNFTModal, setOpenNFTModal] = useState<boolean>(false);
	const [selectedMetadata, setSelectedMetadata] =
		useState<NftMetadata | null>(null);

	useEffect(() => {
		const fetchNftMetadata = async () => {
			if (tokenURIs.length === 0) return;

			const metadataList = await Promise.all(
				tokenURIs.map(async uri => {
					try {
						return await getNftMetadata(uri, nft_contract_address);
					} catch (error) {
						return null;
					}
				})
			);

			setNftMetadataList(
				metadataList.filter(
					(metadata): metadata is NftMetadata => metadata !== null
				)
			);
		};

		fetchNftMetadata();
	}, [tokenURIs]);

	if (is_eligible === "false") {
		return null;
	}

	if (nftMetadataList.length == 0) return null;

	return (
		<div className="section-width section-spacer-md">
			<div className="flex flex-col gap-8 w-full">
				<div>
					{balance.data != undefined && balance.data > 0n && (
						<div className="flex flex-col items-start gap-2">
							<h1 className="text-3xl text-text-100 font-normal mb-4">
								Your NFTs:
							</h1>
							<p className="text-md text-text-200 mb-8">
								Here you can view your nfts that allow you to
								participate
							</p>
							{nftMetadataList.length > 0 && (
								<div className="grid w-full justify-items-center gap-4 sm:grid-cols-2 lg:grid-cols-3">
									{nftMetadataList.map((metadata, index) => (
										<NFTCard
											key={
												metadata.tokenId?.toString() ??
												index
											}
											metadata={metadata}
											index={index}
											onSelect={selected => {
												setSelectedMetadata(selected);
												setOpenNFTModal(true);
											}}
										/>
									))}
								</div>
							)}
						</div>
					)}

					<NFTView
						nft_metadata={selectedMetadata}
						openNFTModal={openNFTModal}
						setOpenNFTModal={setOpenNFTModal}
					/>
				</div>
			</div>
		</div>
	);
};

export default ({
	network,
	user_address,
	nft_contract_address,
	is_eligible,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<NFTList
					user_address={user_address}
					nft_contract_address={nft_contract_address}
					is_eligible={is_eligible}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
