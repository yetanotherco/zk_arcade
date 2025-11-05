import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastContainer } from "../../components/Toast";
import { ToastsProvider } from "../../state/toast";
import { ConnectKitButton } from "connectkit";
import { Button } from "../../components";
import { useNftContract } from "../../hooks/useNftContract";
import { useToast } from "../../state/toast";
import { useSecondNftContract } from "../../hooks/useSecondNftContract";

type Props = {
	nft_contract_address: Address;
	user_address?: Address;
	second_nft_contract_address: Address;
	network: string;
	// whether it has a discount in the second nft
	is_eligible_for_discount: string;
	// whether in can mint the original premium nft
	is_eligible: string;
};

const BuyNftFlow = ({
	nft_contract_address,
	second_nft_contract_address,
	user_address,
	is_eligible,
	is_eligible_for_discount,
}: Omit<Props, "network">) => {
	const initialEligibility =
		typeof is_eligible === "string" ? is_eligible === "true" : is_eligible;
	const discountEligibility =
		typeof is_eligible_for_discount === "string"
			? is_eligible_for_discount === "true"
			: !!is_eligible_for_discount;

	const { addToast } = useToast();
	const { balanceMoreThanZero: primaryHasMinted } = useNftContract({
		contractAddress: nft_contract_address,
		userAddress: user_address || "0x0",
	});
	const {
		balanceMoreThanZero: secondaryHasMinted,
		buyNft,
		discount,
		nftPrice,
		stockLeft,
		nftImage,
		totalSupply,
	} = useSecondNftContract({
		contractAddress: second_nft_contract_address,
		userAddress: user_address || "0x0",
	});
	const alreadyMinted =
		(primaryHasMinted || secondaryHasMinted) && !!user_address;

	// If it elligible for the premium nft, redirect to that page
	useEffect(() => {
		if (!user_address) return;
		if (alreadyMinted) return;
		if (initialEligibility) {
			addToast({
				title: "Eligible for free mint",
				desc: "Redirecting you to the mint page…",
				type: "success",
			});

			try {
				setTimeout(() => {
					window.location.href = "/mint";
				}, 600);
			} catch (_) {}
		}
	}, [user_address, alreadyMinted, initialEligibility, addToast]);

	return (
		<div className="max-w-xl mx-auto bg-contrast-100/40 rounded p-6 flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-semibold">Buy limited NFT</h2>
				<p className="text-sm text-text-200">
					Complete the steps to purchase from the limited collection
					and participate in ZK Arcade.
				</p>
			</div>

			{alreadyMinted && (
				<div className="border border-accent-100/40 rounded p-3 text-sm text-accent-100 bg-accent-100/5">
					You already own an NFT. No further action needed.
				</div>
			)}

			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 1: Connect wallet
					</span>
					<span
						className={
							user_address ? "text-accent-100" : "text-text-200"
						}
					>
						{user_address ? "Connected" : "Required"}
					</span>
				</div>
				<ConnectKitButton.Custom>
					{({
						isConnected: kitConnected,
						ensName,
						show,
						truncatedAddress,
					}) => {
						const displayAddress =
							ensName ??
							truncatedAddress ??
							(user_address
								? `${user_address.slice(
										0,
										6
								  )}...${user_address.slice(-4)}`
								: null);

						if (kitConnected || user_address) {
							return (
								<p className="text-sm text-text-200">
									Connected as{" "}
									<span className="font-mono">
										{displayAddress}
									</span>
								</p>
							);
						}

						return (
							<div className="flex flex-col gap-3">
								<p className="text-sm text-text-200">
									Connect your wallet to continue.
								</p>
								<Button variant="accent-fill" onClick={show}>
									Connect Wallet
								</Button>
							</div>
						);
					}}
				</ConnectKitButton.Custom>
			</div>

			{/* Step 2: Discount eligibility */}
			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 2: Check discount eligibility
					</span>
					<span
						className={
							discountEligibility
								? "text-accent-100"
								: "text-text-200"
						}
					>
						{discountEligibility ? "Elligible" : "Not elligible"}
					</span>
				</div>
				<p className="text-sm text-text-200">
					{discountEligibility
						? `You are elligible for a ${discount} discount!`
						: "You aren't elligible for discount but you can still buy it!"}
				</p>
			</div>

			{/* Step 3: Buy */}
			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 3: Buy NFT
					</span>
					<span
						className={
							alreadyMinted ? "text-accent-100" : "text-text-200"
						}
					>
						{alreadyMinted ? "Completed" : "Pending"}
					</span>
				</div>
				<div className="flex gap-4 items-center">
					<img
						src={nftImage}
						alt="NFT"
						className="w-20 h-20 object-cover rounded border border-contrast-100"
					/>
					<div className="flex flex-col gap-1">
						<p className="text-sm text-text-200">
							Price:{" "}
							<span className="text-white">
								{nftPrice.data} ETH
							</span>
						</p>
						<p className="text-sm text-text-200">
							Stock:{" "}
							<span className="text-white">
								{stockLeft.data}/{totalSupply.data}
							</span>
						</p>
					</div>
				</div>
				<Button
					variant="accent-fill"
					onClick={buyNft.call}
					isLoading={buyNft.isLoading}
					disabled={alreadyMinted}
				>
					Buy Now
				</Button>
			</div>
		</div>
	);
};

export const BuyNft = ({ network, ...props }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<BuyNftFlow {...props} />
			</ToastsProvider>
		</Web3EthProvider>
	);
};
