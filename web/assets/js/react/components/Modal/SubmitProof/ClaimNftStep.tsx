import React from "react";
import { useNftContract } from "../../../hooks/useNftContract";
import { Address } from "../../../types/blockchain";
import { Button } from "../../Button";
import { NFTClaimMerkleProof } from "../../../types/aligned";

type Props = {
	nft_contract_address: Address;
	user_address: Address;
	tokenURI: string;
	merkle_proof: NFTClaimMerkleProof;
};

export const ClaimNft = ({
	nft_contract_address,
	user_address,
	merkle_proof,
	tokenURI,
}: Props) => {
	const { claimNft, receipt } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address,
	});

	const { isLoading, isSuccess, error } = receipt;

	return (
		<div>
			<Button variant="accent-fill" onClick={() => claimNft()}>
				Claim NFT
			</Button>
		</div>
	);
};
