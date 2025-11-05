import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";

type Props = {
	nft_contract_address: Address;
	second_nft_contract_address: Address;
	network: string;
	is_eligible_for_discount: boolean;
};

const Component = ({
	nft_contract_address,
	second_nft_contract_address,
}: Omit<Props, "network">) => {
	return (
		<div>
			<h1>Buy NFt</h1>p
		</div>
	);
};

export const BuyNft = ({ network, ...props }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<Component {...props} />
		</Web3EthProvider>
	);
};
