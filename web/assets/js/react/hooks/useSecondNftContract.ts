import { useEffect, useState } from "react";
import { Address } from "../types/blockchain";

export const useSecondNftContract = ({
	contractAddress,
	userAddress,
}: {
	contractAddress: Address;
	userAddress: Address;
}) => {
	// TODO: this would come from the contract
	const [nftPrice, setNftPrice] = useState<number | null>(null);
	const [discount, setDiscount] = useState<number | null>(null);
	const [balance, setBalance] = useState<number | null>(null);
	const balanceMoreThanZero = Number(balance) > 0;
	// putting beast image to have something to render until we have the actual nft
	const [nftImage, setNftImage] = useState("/images/beast.jpg");
	const [stockLeft, setStockLeft] = useState(6032);
	const [totalSupply, setTotalSupply] = useState(10000);

	useEffect(() => {
		setNftPrice(0.1);
		setDiscount(10); // 10% discount
	}, []);

	const buyNft = () => {};

	return {
		buyNft: {
			call: buyNft,
			isLoading: false,
		},
		nftPrice: {
			isLoading: nftPrice === null,
			data: nftPrice,
		},
		discount: {
			isLoading: discount === null,
			data: discount,
		},
		balance: {
			isLoading: balance === null,
			data: balance,
		},
		nftImage,
		balanceMoreThanZero,
		stockLeft: {
			isLoading: false,
			data: stockLeft,
		},
		totalSupply: {
			isLoading: false,
			data: totalSupply,
		},
	};
};
