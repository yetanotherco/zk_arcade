import React, { useEffect, useRef, useState } from "react";
import { BalanceScoreInAligned } from "./BalanceScoreInAligned";
import { Address } from "../../types/blockchain";
import { ProofSubmissions } from "./ProofSubmissions";
import { ProofSubmission } from "../../types/aligned";
import { Button } from "../../components";
import { useDisconnect } from "wagmi";
import { NftSuccessModal } from "../../components/Modal";
import { useModal } from "../../hooks";
import { useNftContract, NftMetadata } from "../../hooks/useNftContract";
import {
	getNftMetadata,
	getNftMetadataIpfs,
} from "../../hooks/useNftContract/utils";
import { usePublicNftContract } from "../../hooks/usePublicNftContract";

type Props = {
	network: string;
	payment_service_address: Address;
	leaderboard_address: Address;
	nft_contract_address: Address;
	public_nft_contract_address: Address;
	user_address: Address;
	proofs: ProofSubmission[];
	username: string;
	user_position: number;
	explorer_url: string;
	batcher_url: string;
	is_eligible: boolean;
};

export const WalletInfo = ({
	payment_service_address,
	nft_contract_address,
	leaderboard_address,
	user_address,
	proofs,
	username,
	user_position,
	explorer_url,
	batcher_url,
	is_eligible,
	public_nft_contract_address,
}: Props) => {
	const formRef = useRef<HTMLFormElement>(null);
	const [claimed, setClaimed] = useState(false);
	const {
		balance,
		tokenURIs,
		showSuccessModal,
		setShowSuccessModal,
		claimedNftMetadata,
	} = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});
	const {
		balanceMoreThanZero: hasClaimedPublicNft,
		tokenURIs: publicTokenUris,
	} = usePublicNftContract({
		contractAddress: public_nft_contract_address,
		userAddress: user_address,
	});

	const { disconnect } = useDisconnect();

	const [nftMetadataList, setNftMetadataList] = useState<NftMetadata[]>([]);

	const handleDisconnect = () => {
		disconnect();
		Object.keys(localStorage).forEach(key => {
			if (key.startsWith("wagmi.") || key.startsWith("wc@")) {
				localStorage.removeItem(key);
			}
		});
		formRef.current?.submit();
	};

	const eligibilityClasses = is_eligible
		? "bg-accent-100/20 border-accent-100 text-accent-100"
		: "bg-blue/20 border-blue text-blue";

	const eligibilityText = is_eligible
		? "You are eligible to mint the NFT and participate in the contest."
		: "Mint an NFT to participate in ZKArcade and claim the leaderboard.";

	useEffect(() => {
		const fetchNftMetadata = async () => {
			if (tokenURIs.length === 0 && publicTokenUris.length === 0) {
				setNftMetadataList([]);
				return;
			}

			const metadataRequests = [
				...tokenURIs.map(uri => ({
					uri,
					fetcher: getNftMetadataIpfs,
					contract: nft_contract_address,
				})),
				...publicTokenUris.map(uri => ({
					uri,
					fetcher: getNftMetadata,
					contract: public_nft_contract_address,
				})),
			];

			const metadataList = await Promise.all(
				metadataRequests.map(async ({ uri, fetcher, contract }) => {
					try {
						return await fetcher(uri, contract);
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
	}, [
		tokenURIs,
		publicTokenUris,
		nft_contract_address,
		public_nft_contract_address,
	]);

	const hasAnyBalance =
		(balance.data !== undefined && balance.data > 0n) ||
		hasClaimedPublicNft;

	return (
		<div className="sm:relative group">
			<div className="flex flex-row items-center gap-3">
				<div>
					<p className="text-xs">Connected:</p>
					<p className="font-bold text-md">
						{`${user_address.slice(0, 5)}...${user_address.slice(
							-4
						)}`}
					</p>
				</div>
				<span className="hero-chevron-down size-3.5 group-hover:-rotate-180 transition duration-300" />
			</div>

			<div className="pt-2">
				<div
					className="overflow-scroll flex flex-col gap-8 p-8 absolute max-sm:left-0 sm:w-[450px] w-full sm:right-0 shadow-2xl bg-contrast-100 rounded opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-10"
					style={{ maxHeight: 450 }}
				>
					<div className="flex gap-2 items-center justify-between w-full">
						<div className="flex gap-2 items-center">
							{hasAnyBalance ? (
								<img
									src={nftMetadataList.at(0)?.image}
									alt={nftMetadataList.at(0)?.name || "NFT"}
									title={nftMetadataList.at(0)?.name}
									style={{ maxWidth: "30px" }}
								/>
							) : (
								<span className="hero-user" />
							)}
							<a
								href="/history"
								className="text-lg hover:underline"
							>
								{username}{" "}
								{user_position === null
									? "(#None)"
									: `(#${user_position})`}
							</a>
						</div>
						<div>
							<form
								ref={formRef}
								action="/wallet/disconnect"
								method="get"
								className="hidden"
							/>
							<Button
								variant="text"
								className="text-red text-sm"
								onClick={handleDisconnect}
							>
								Disconnect
							</Button>
						</div>
					</div>

					{!claimed &&
						balance.data === 0n &&
						!hasClaimedPublicNft && (
							<div
								className={`flex flex-col items-start gap-2 border rounded p-3 ${eligibilityClasses}`}
							>
								<p className="text-sm leading-5">
									{eligibilityText}{" "}
								</p>
								{is_eligible ? (
									<p
										className="text-accent-100 cursor-pointer hover:underline font-medium"
										onClick={() =>
											window.location.assign("/mint")
										}
									>
										Claim!
									</p>
								) : (
									<p
										className="text-blue cursor-pointer hover:underline font-medium"
										onClick={() =>
											window.location.assign("/nft/mint")
										}
									>
										Mint!
									</p>
								)}
							</div>
						)}

					<BalanceScoreInAligned
						payment_service_address={payment_service_address}
						leaderboard_address={leaderboard_address}
						user_address={user_address}
					/>

					<ProofSubmissions
						proofs={proofs}
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						explorer_url={explorer_url}
						user_address={user_address}
						batcher_url={batcher_url}
						nft_contract_address={nft_contract_address}
						public_nft_contract_address={
							public_nft_contract_address
						}
						highest_level_reached={0}
					/>
				</div>
			</div>

			<NftSuccessModal
				open={showSuccessModal}
				setOpen={setShowSuccessModal}
				nftMetadata={claimedNftMetadata}
			/>
		</div>
	);
};
