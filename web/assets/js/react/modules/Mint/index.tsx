import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { Address } from "viem";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { Button, SocialLinks } from "../../components";
import { NftSuccessModal } from "../../components/Modal";
import { ToastContainer } from "../../components/Toast";
import { ToastsProvider } from "../../state/toast";
import { useNftContract } from "../../hooks/useNftContract";
import { usePublicNftContract } from "../../hooks/usePublicNftContract";
import { fetchNftClaimEligibility } from "../../utils/aligned";

type Props = {
	network: string;
	user_address?: Address;
	nft_contract_address: Address;
	public_nft_contract_address: Address;
	is_eligible?: string;
};

type MintFlowProps = Omit<Props, "network">;

type Status =
	| "idle"
	| "checking"
	| "eligible"
	| "ineligible"
	| "claiming"
	| "claimed"
	| "error";

const formatAddress = (addr: Address) =>
	`${addr.slice(0, 6)}...${addr.slice(-4)}`;

const MintClaimSection = ({
	address,
	nftContractAddress,
	publicNftContractAddress,
	initialEligibility,
}: {
	address: Address;
	nftContractAddress: Address;
	publicNftContractAddress: Address;
	initialEligibility?: boolean;
}) => {
	const shouldShowBuyCta = initialEligibility === false;
	const encouragePurchaseMessage =
		"Your wallet isn't eligible to claim this drop. Buy an access NFT to jump in right away.";

	const {
		claimNft,
		receipt,
		balance,
		balanceMoreThanZero,
		showSuccessModal,
		setShowSuccessModal,
		claimedNftMetadata,
	} = useNftContract({
		contractAddress: nftContractAddress,
		userAddress: address,
	});

	const [status, setStatus] = useState<Status>(() => {
		if (initialEligibility === true) return "eligible";
		if (initialEligibility === false) return "ineligible";
		return "idle";
	});
	const [message, setMessage] = useState<string | null>(() => {
		if (initialEligibility === true) {
			return "Your wallet is eligible to mint this NFT.";
		}
		if (initialEligibility === false) {
			return encouragePurchaseMessage;
		}
		return null;
	});
	const [lastAction, setLastAction] = useState<
		"eligibility" | "claim" | null
	>(initialEligibility !== undefined ? "eligibility" : null);

	const checkEligibility = useCallback(async () => {
		if (balanceMoreThanZero) {
			setLastAction("claim");
			setStatus("claimed");
			setMessage("You already claimed this NFT.");
			return;
		}

		setLastAction("eligibility");
		setStatus("checking");
		setMessage("Checking eligibility…");
		try {
			const result = await fetchNftClaimEligibility(address);
			if (!result) {
				throw new Error("Failed to verify eligibility.");
			}
			if (result.eligible) {
				setStatus("eligible");
				setMessage("Your wallet is eligible to mint this NFT.");
			} else {
				setStatus("ineligible");
				setMessage(
					shouldShowBuyCta
						? encouragePurchaseMessage
						: "You're not eligible yet, but more waves are on the way."
				);
			}
		} catch (err: any) {
			setStatus("error");
			setMessage(
				err?.message ?? "Failed to check eligibility. Please retry."
			);
		}
	}, [
		address,
		balanceMoreThanZero,
		encouragePurchaseMessage,
		shouldShowBuyCta,
	]);

	useEffect(() => {
		checkEligibility();
	}, [checkEligibility]);

	useEffect(() => {
		if (balance.data === undefined) {
			return;
		}
		if (balance.data > 0n) {
			setLastAction("claim");
			setStatus("claimed");
			setMessage("You already claimed this NFT.");
		}
	}, [balance.data]);

	useEffect(() => {
		if (receipt.isLoading) {
			setLastAction("claim");
			setStatus("claiming");
			setMessage("Submitting claim transaction…");
		}
	}, [receipt.isLoading]);

	useEffect(() => {
		if (receipt.isSuccess) {
			setLastAction("claim");
			setStatus("claimed");
			setMessage("Your NFT was claimed successfully.");
		}
	}, [receipt.isSuccess]);

	useEffect(() => {
		if (!receipt.error) return;
		setLastAction("claim");
		setStatus("error");
		const text =
			typeof receipt.error === "string"
				? receipt.error
				: (receipt.error as any)?.message;
		setMessage(text ?? "Transaction failed. Please try again.");
	}, [receipt.error]);

	const onClaim = useCallback(async () => {
		if (status !== "eligible") {
			return;
		}
		setLastAction("claim");
		setStatus("claiming");
		setMessage("Submitting claim transaction…");
		try {
			await claimNft();
		} catch (err: any) {
			setStatus("error");
			setMessage(
				err?.message ??
					"Failed to submit claim transaction. Please retry."
			);
		}
	}, [status, claimNft]);

	const onBuy = useCallback(() => {
		if (typeof window === "undefined") return;
		window.location.href = "/nft/buy";
	}, []);

	const checkLabel = useMemo(() => {
		if (status === "checking") return "Checking…";
		if (status === "eligible") return "Re-check eligibility";
		if (status === "ineligible") return "Check again";
		if (status === "error" && lastAction !== "claim")
			return "Retry eligibility check";
		return "Check eligibility";
	}, [status, lastAction]);

	const claimLabel = useMemo(() => {
		if (status === "claiming") return "Claiming…";
		if (status === "claimed") return "Claimed";
		return "Claim NFT";
	}, [status]);

	const eligibilityMessage =
		lastAction !== "claim" || status === "checking" ? message : null;
	const claimMessage = lastAction === "claim" ? message : null;

	const eligibilityMessageClass =
		status === "error" && lastAction !== "claim"
			? "text-red"
			: "text-text-200";
	const claimMessageClass =
		status === "error" && lastAction === "claim"
			? "text-red"
			: "text-text-200";

	const isEligibilityBusy = status === "checking" || status === "claiming";
	const canClaim = status === "eligible" && !balanceMoreThanZero;
	const alreadyMinted = status === "claimed" || balanceMoreThanZero;

	return (
		<div className="flex flex-col gap-4">
			{alreadyMinted && (
				<div className="border border-accent-100/40 rounded p-3 text-sm text-accent-100 bg-accent-100/5">
					You already claimed this NFT.
				</div>
			)}
			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 2: Check eligibility
					</span>
					<span className="text-text-200">
						{status === "eligible"
							? "Eligible"
							: status === "ineligible"
							? "Not eligible"
							: status === "checking"
							? "Checking…"
							: status === "claimed"
							? "Claimed"
							: status === "error" && lastAction !== "claim"
							? "Error"
							: "Not checked"}
					</span>
				</div>
				<p className="text-sm text-text-200">
					We verify whether your wallet can claim the access NFT.
				</p>
				<Button
					variant="contrast"
					onClick={checkEligibility}
					disabled={isEligibilityBusy}
				>
					{checkLabel}
				</Button>
				{eligibilityMessage && (
					<p className={`text-sm ${eligibilityMessageClass}`}>
						{eligibilityMessage}
					</p>
				)}
				{status === "ineligible" && (
					<SocialLinks className="text-center" />
				)}
			</div>

			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 3: Claim NFT
					</span>
					<span
						className={
							status === "claimed"
								? "text-accent-100"
								: "text-text-200"
						}
					>
						{status === "claimed"
							? "Completed"
							: status === "claiming"
							? "Processing…"
							: "Pending"}
					</span>
				</div>
				<Button
					variant="accent-fill"
					onClick={shouldShowBuyCta ? onBuy : onClaim}
					disabled={shouldShowBuyCta ? false : !canClaim}
					isLoading={!shouldShowBuyCta && status === "claiming"}
					disabledTextOnHover={
						shouldShowBuyCta
							? undefined
							: "Complete eligibility check first"
					}
				>
					{shouldShowBuyCta ? "Go to buy NFT" : claimLabel}
				</Button>
				{claimMessage && (
					<p className={`text-sm ${claimMessageClass}`}>
						{claimMessage}
					</p>
				)}
			</div>
			<NftSuccessModal
				open={showSuccessModal}
				setOpen={setShowSuccessModal}
				nftMetadata={claimedNftMetadata}
			/>
		</div>
	);
};

const MintFlow = ({
	user_address,
	nft_contract_address,
	public_nft_contract_address,
	is_eligible,
}: MintFlowProps) => {
	const isConnected = !!user_address;
	const activeAddress = user_address;
	const initialEligibility =
		typeof is_eligible === "string" ? is_eligible === "true" : is_eligible;

	return (
		<div className="max-w-xl mx-auto bg-contrast-100/40 rounded p-6 flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<h2 className="text-2xl font-semibold">Mint access NFT</h2>
				<p className="text-sm text-text-200">
					Complete the steps below to mint your pass and join the
					game.
				</p>
			</div>

			<div className="border border-contrast-100 rounded p-4 flex flex-col gap-3">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-base">
						Step 1: Connect wallet
					</span>
					<span
						className={
							isConnected && activeAddress
								? "text-accent-100"
								: "text-text-200"
						}
					>
						{isConnected && activeAddress
							? "Connected"
							: "Required"}
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
							(activeAddress
								? formatAddress(activeAddress)
								: null);

						if (kitConnected || activeAddress) {
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
									Connect your wallet to start the mint
									process.
								</p>
								<Button variant="accent-fill" onClick={show}>
									Connect Wallet
								</Button>
							</div>
						);
					}}
				</ConnectKitButton.Custom>
			</div>

			{activeAddress ? (
				<MintClaimSection
					address={activeAddress}
					nftContractAddress={nft_contract_address}
					publicNftContractAddress={public_nft_contract_address}
					initialEligibility={initialEligibility}
				/>
			) : (
				<div className="border border-dashed border-contrast-100 rounded p-4 text-sm text-text-200">
					Complete step 1 to continue with eligibility and minting.
				</div>
			)}
		</div>
	);
};

export const Mint = ({ network, ...rest }: Props) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<MintFlow {...rest} />
			</ToastsProvider>
		</Web3EthProvider>
	);
};
