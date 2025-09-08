import React, { useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { EligibilityModal } from "../../components/Modal/EligibilityModal";
import { useModal } from "../../hooks";
import { useNftContract } from "../../hooks/useNftContract";

type Props = {
	network: string;
	user_address: Address;
	nft_contract_address: Address;
	is_eligible: string;
};

const ClaimNFT = ({
	is_eligible,
	nft_contract_address,
	user_address,
}: Omit<Props, "network">) => {
	const { open: mintModalOpen, setOpen: setMintModalOpen } = useModal();
	const [claimed, setClaimed] = useState(false);
	const { balance } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});

	const isEligible = is_eligible === "true";
	const eligibilityClasses = isEligible
		? "bg-green-50 border-green-300 text-green-900"
		: "bg-amber-50 border-amber-300 text-amber-900";

	const eligibilityText = isEligible
		? "You are eligible to mint the NFT and participate in the contest."
		: "You are not currently eligible to mint the NFT and participate in the contest.";

	if (claimed || balance.data !== 0n) {
		return null;
	}

	return (
		<div
			className={`flex flex-col items-start gap-2 border rounded p-3 ${eligibilityClasses}`}
		>
			<p className="text-sm leading-5">{eligibilityText} </p>
			{isEligible && (
				<p
					className="text-green-600 cursor-pointer hover:underline"
					onClick={() => setMintModalOpen(true)}
				>
					Claim!
				</p>
			)}

			<EligibilityModal
				isEligible={isEligible}
				nft_contract_address={nft_contract_address}
				open={mintModalOpen}
				setOpen={setMintModalOpen}
				user_address={user_address}
				onClose={() => setClaimed(true)}
			/>
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
				<ClaimNFT
					user_address={user_address}
					nft_contract_address={nft_contract_address}
					is_eligible={is_eligible}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
