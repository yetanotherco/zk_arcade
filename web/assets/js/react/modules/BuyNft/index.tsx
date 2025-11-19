import React, { useEffect, useMemo } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastContainer } from "../../components/Toast";
import { ToastsProvider } from "../../state/toast";
import { ConnectKitButton } from "connectkit";
import { Button } from "../../components";
import { useNftContract } from "../../hooks/useNftContract";
import { useToast } from "../../state/toast";
import { usePublicNftContract } from "../../hooks/usePublicNftContract";
import { NftSuccessModal } from "../../components/Modal";

type Props = {
	nft_contract_address: Address;
	user_address?: Address;
	public_nft_contract_address: Address;
	network: string;
	// whether it has a discount in the public nft
	is_eligible_for_discount: string;
	// whether in can mint the original premium nft
	is_eligible: string;
};

const weiToEth = (wei: Number) => {
	return Number(wei) / 1e18;
};

const BuyNftFlow = ({
	nft_contract_address,
	public_nft_contract_address,
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
		balanceMoreThanZero: publicHasMinted,
		discountedPrice,
		fullPrice,
		supplyLeft,
		totalSupply,
		claimNft,
		claimIsLoading,
		showSuccessModal,
		setShowSuccessModal,
		claimedNftMetadata,
		maxSupply,
		receipt,
	} = usePublicNftContract({
		contractAddress: public_nft_contract_address,
		userAddress: user_address || "0x0",
	});
	const alreadyMinted =
		(primaryHasMinted || publicHasMinted || receipt.isSuccess) &&
		!!user_address;

	const priceIsLoading = fullPrice.isLoading;
	const stockIsLoading = totalSupply.isLoading;

	const discountedPricePercentage = useMemo(() => {
		if (fullPrice.data == null) return null;
		const base = Number(fullPrice.data);
		const discounted = Number(discountedPrice.data || 0);
		return (discounted / base) * 100;
	}, [fullPrice.data, discountedPrice.data]);

	// If it elligible for the premium nft, redirect to that page
	useEffect(() => {
		if (initialEligibility) {
			addToast({
				title: "Eligible for free mint",
				desc: "Redirecting you to the mint page…",
				type: "success",
			});

			try {
				setTimeout(() => {
					window.location.href = "/mint";
				}, 1000);
			} catch (_) {}
		}
	}, [initialEligibility]);

	return (
		<div className="max-w-xl mx-auto bg-contrast-100/40 rounded p-6 flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-semibold">Mint limited NFT</h2>
			</div>

			{alreadyMinted && (
				<div className="border border-accent-100/40 rounded p-3 text-sm text-accent-100 bg-accent-100/5">
					You already own an NFT. No further action needed.
				</div>
			)}

			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Connect wallet
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


			{/* Step 3: Buy */}
			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Mint NFT
					</span>
					<span
						className={
							alreadyMinted ? "text-accent-100" : "text-text-200"
						}
					>
						{alreadyMinted ? "Completed" : "Pending"}
					</span>
				</div>
				<div className="flex flex-col md:flex-row gap-6 md:items-center">
					<img
						src="/images/public_nft_image.jpeg"
						alt="NFT"
						className="w-64 h-64 object-cover rounded border border-contrast-100 mx-auto md:mx-0"
					/>
					<div className="flex flex-col gap-2">
						<p className="text-base text-text-200">
							Price:{" "}
							{priceIsLoading ? (
								<span className="animate-pulse">Loading…</span>
							) : discountEligibility &&
							  discountedPricePercentage ? (
								<span className="text-white text-lg font-semibold">
									<span className="line-through opacity-70 mr-2 text-sm">
										{weiToEth(Number(fullPrice.data))} ETH
									</span>
									<span className="text-accent-100 font-semibold mr-2 text-sm">
										-{Number(discountedPricePercentage)}%
									</span>
									<br />
									<span>
										{weiToEth(Number(discountedPrice.data))}{" "}
										ETH
									</span>
								</span>
							) : (
								<span className="text-white text-lg font-semibold">
									{weiToEth(Number(fullPrice.data))} ETH
								</span>
							)}
						</p>
						<p className="text-base text-text-200">
							Stock:{" "}
							{stockIsLoading ? (
								<span className="animate-pulse">Loading…</span>
							) : (
								<span className="text-white text-lg font-semibold">
									{Number(supplyLeft)}/
									{Number(maxSupply.data)}
								</span>
							)}
						</p>
					</div>
				</div>
				<Button
					variant="accent-fill"
					onClick={() => claimNft(discountEligibility)}
					isLoading={claimIsLoading}
					disabled={alreadyMinted || initialEligibility}
				>
					{alreadyMinted ? "Already Minted" : "Mint Now"}
				</Button>
			</div>

			<NftSuccessModal
				open={showSuccessModal}
				setOpen={setShowSuccessModal}
				nftMetadata={claimedNftMetadata}
			/>
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
