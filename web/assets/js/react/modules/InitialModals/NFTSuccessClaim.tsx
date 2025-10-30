import React, { useEffect, useState } from "react";
import { Address } from "viem";
import { NftMetadata } from "../../hooks/useNftContract";
import { usePublicClient } from "wagmi";
import {
	getNftMetadata,
	getTokenURI,
	getUserTokenIds,
} from "../../hooks/useNftContract/utils";
import { NftSuccessModal } from "../../components/Modal";

export const NftSuccessClaim = ({
	userAddress,
	contractAddress,
}: {
	userAddress: Address;
	contractAddress: Address;
}) => {
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [claimedNftMetadata, setClaimedNftMetadata] =
		useState<NftMetadata | null>(null);

	const publicClient = usePublicClient();

	useEffect(() => {
		const run = async () => {
			try {
				if (!userAddress || !publicClient) return;

				const storageKey = `${userAddress}:hasShownSuccessModal`;
				const hasShown = localStorage.getItem(storageKey);
				if (hasShown) return;

				const tokenIds = await getUserTokenIds(userAddress as any);
				if (!tokenIds || tokenIds.length === 0) return;

				const latestTokenId = tokenIds[tokenIds.length - 1];
				if (latestTokenId === undefined) return;

				const tokenURI = await getTokenURI(
					publicClient,
					contractAddress as any,
					latestTokenId
				);
				const metadata = await getNftMetadata(
					tokenURI,
					contractAddress as any
				);
				setClaimedNftMetadata(metadata);
				setShowSuccessModal(true);
				try {
					localStorage.setItem(storageKey, "true");
				} catch {}
			} catch (e) {}
		};
		run();
	}, [
		userAddress,
		contractAddress,
		publicClient,
		setShowSuccessModal,
		setClaimedNftMetadata,
	]);

	return (
		<NftSuccessModal
			open={showSuccessModal}
			setOpen={setShowSuccessModal}
			nftMetadata={claimedNftMetadata}
			onClose={() => {
				try {
					localStorage.setItem(
						`${userAddress}:hasShownSuccessModal`,
						"true"
					);
				} catch {}
			}}
		/>
	);
};
