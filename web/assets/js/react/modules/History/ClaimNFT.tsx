import React, { useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { EligibilityModal } from "../../components/Modal/EligibilityModal";
import { NftSuccessModal } from "../../components/Modal";
import { useModal } from "../../hooks";
import { useNftContract } from "../../hooks/useNftContract";
import { usePublicNftContract } from "../../hooks/usePublicNftContract";
import { isPublicNftContractEnabled } from "../../utils/publicNftContract";

type Props = {
	network: string;
	user_address: Address;
	nft_contract_address: Address;
	public_nft_contract_address: Address;
	is_eligible: string;
};

const ClaimNFT = ({
	is_eligible,
	nft_contract_address,
	public_nft_contract_address,
	user_address,
}: Omit<Props, "network">) => {
	const { open: mintModalOpen, setOpen: setMintModalOpen } = useModal();
	const [claimed, setClaimed] = useState(false);
	const {
		balance,
		claimNft,
		receipt,
		showSuccessModal,
		setShowSuccessModal,
		claimedNftMetadata,
	} = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});

	// Check if public NFT contract is enabled
	const isPublicNftEnabled = isPublicNftContractEnabled(public_nft_contract_address);

	const { balanceMoreThanZero: publicNftBalanceMoreThanZero } =
		usePublicNftContract({
			contractAddress: public_nft_contract_address,
			userAddress: user_address,
		});

	const isEligible = is_eligible === "true";
	const eligibilityClasses = isEligible
		? "bg-accent-100/20 border-accent-100 text-accent-100"
		: "bg-blue/20 border-blue text-blue";

	const eligibilityText = isEligible
		? "You are eligible to mint the NFT and participate in the contest."
		: isPublicNftEnabled
			? "Buy an NFT to participate in ZKArcade and claim the leaderboard."
			: "You need an NFT to participate in ZKArcade. The public NFT collection is not currently available.";

	// Only consider public NFT balance if the contract is enabled
	const hasPublicNft = isPublicNftEnabled && publicNftBalanceMoreThanZero;

	if (claimed || balance.data !== 0n || hasPublicNft) {
		return (
			<NftSuccessModal
				open={showSuccessModal}
				setOpen={setShowSuccessModal}
				nftMetadata={claimedNftMetadata}
			/>
		);
	}
	return (
		<>
			<div
				className={`flex flex-col items-start gap-2 border rounded p-3 ${eligibilityClasses}`}
			>
				<p className="text-sm leading-5">{eligibilityText} </p>
				{isEligible ? (
					<p
						className="text-accent-100 cursor-pointer hover:underline font-medium"
						onClick={() => window.location.assign("/mint")}
					>
						Claim!
					</p>
				) : isPublicNftEnabled ? (
					<p
						className="text-blue cursor-pointer hover:underline font-medium"
						onClick={() => window.location.assign("/nft/buy")}
					>
						Buy!
					</p>
				) : null}

				<EligibilityModal
					isEligible={isEligible}
					open={mintModalOpen}
					setOpen={setMintModalOpen}
					onClose={() => setClaimed(true)}
					claimNft={claimNft}
					balance={balance.data || 0n}
					isLoading={receipt.isLoading}
				/>
			</div>
		</>
	);
};

export default ({
	network,
	user_address,
	nft_contract_address,
	public_nft_contract_address,
	is_eligible,
}: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<ClaimNFT
					user_address={user_address}
					nft_contract_address={nft_contract_address}
					is_eligible={is_eligible}
					public_nft_contract_address={public_nft_contract_address}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
