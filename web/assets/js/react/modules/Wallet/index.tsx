import React, { useEffect, useState } from "react";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ConnectWallet } from "./ConnectWallet";
import { SignAgreement } from "./SignAgreement";
import { WalletInfo } from "./WalletInfo";
import { Address } from "../../types/blockchain";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { useAccount } from "wagmi";
import { useProofSentMessageReader } from "../../hooks/useProofSentMessageReader";
import { NotificationBell } from "./Notifications";

type Props = {
	network: string;
	payment_service_address: Address;
	leaderboard_address: Address;
	user_address?: Address;
	proofs: string;
	needs_agreement?: boolean;
	username: string;
	user_position: number;
	explorer_url: string;
	batcher_url: string;
};

const WalletContent = ({
	network,
	payment_service_address,
	leaderboard_address,
	user_address,
	proofs,
	username,
	user_position,
	explorer_url,
	batcher_url,
}: Omit<Props, "needs_agreement">) => {
	const { address, isConnected } = useAccount();
	const [needsAgreement, setNeedsAgreement] = useState(false);
	const [isCheckingAgreement, setIsCheckingAgreement] = useState(false);
	useProofSentMessageReader();

	// Check if connected wallet needs agreement
	useEffect(() => {
		if (isConnected && address && !user_address) {
			setIsCheckingAgreement(true);
			fetch(`/api/wallet/${address}/agreement-status`)
				.then(response => response.json())
				.then(data => {
					if (data.session_created) {
						// Session was created for existing wallet, reload page to show wallet info
						window.location.reload();
					} else {
						setNeedsAgreement(!data.has_agreement);
						setIsCheckingAgreement(false);
					}
				})
				.catch(error => {
					console.error("Error checking agreement status:", error);
					setNeedsAgreement(true); // Default to showing agreement on error
					setIsCheckingAgreement(false);
				});
		} else {
			setNeedsAgreement(false);
			setIsCheckingAgreement(false);
		}
	}, [isConnected, address, user_address]);

	// Case 1: User has completed session (signed agreement)
	if (user_address) {
		const decodedProofs = JSON.parse(proofs);
		return (
			<div className="flex flex-row items-center gap-8">
				<div className="md:block hidden">
					<NotificationBell
						proofs={decodedProofs}
						leaderboard_address={leaderboard_address}
						payment_service_address={payment_service_address}
						user_address={user_address}
					/>
				</div>
				<WalletInfo
					network={network}
					leaderboard_address={leaderboard_address}
					payment_service_address={payment_service_address}
					user_address={user_address}
					proofs={decodedProofs}
					username={username}
					user_position={user_position}
					explorer_url={explorer_url}
					batcher_url={batcher_url}
				/>
			</div>
		);
	}

	// Case 2: Wallet connected but needs to sign agreement
	if (isConnected && address && needsAgreement && !isCheckingAgreement) {
		return <SignAgreement />;
	}

	// Case 3: No wallet connected or checking agreement status
	return <ConnectWallet />;
};

export default ({
	network,
	payment_service_address,
	leaderboard_address,
	user_address,
	proofs,
	username,
	user_position,
	explorer_url,
	batcher_url,
}: Omit<Props, "needs_agreement">) => {
	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<WalletContent
					network={network}
					payment_service_address={payment_service_address}
					leaderboard_address={leaderboard_address}
					user_address={user_address}
					proofs={proofs}
					username={username}
					user_position={user_position}
					explorer_url={explorer_url}
					batcher_url={batcher_url}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};
