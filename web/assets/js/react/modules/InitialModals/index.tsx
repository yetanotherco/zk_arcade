// src/pages/EncourageDepositing/index.tsx
import React, { useEffect, useState } from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { EncourageDepositingModal } from "./EncourageDepositingModal";
import { EligibilityModal } from "./EligibilityModal";

type Props = {
	network: string;
	payment_service_address: Address;
	user_address: Address;
	eligible: string;
};

const getUserViewedMap = (key: string): Record<string, boolean> => {
	try {
		return JSON.parse(localStorage.getItem(key) || "{}");
	} catch {
		return {};
	}
};
const hasUserViewed = (key: string, userAddress: string): boolean => {
	const viewedMap = getUserViewedMap(key);
	return viewedMap[userAddress] === true;
};

/// This components show initial modals to the user to guide him through the usage of zk-arcade
const InitialModals = ({
	network,
	payment_service_address,
	user_address,
	eligible,
}: Props) => {
	const isEligible = eligible === "true";
	const [eligibilityPending, setEligibilityPending] = useState(true);

	useEffect(() => {
		const viewedHowItWorks = JSON.parse(
			localStorage.getItem("how-it-works-viewed") || "false"
		);
		const viewedEligibility = hasUserViewed(
			"eligibility-viewed",
			user_address
		);
		// Encourage deposit after showing how it works and eligibility status
		// also if the user isn't eligible yet, don't show the deposit encouragement
		setEligibilityPending(
			!isEligible || !viewedHowItWorks || !viewedEligibility
		);
	}, [user_address]);

	return (
		<Web3EthProvider network={network}>
			<ToastsProvider>
				<ToastContainer />
				<EligibilityModal
					user_address={user_address}
					isEligible={isEligible}
				/>
				<EncourageDepositingModal
					payment_service_address={payment_service_address}
					user_address={user_address}
					blocked={eligibilityPending}
				/>
			</ToastsProvider>
		</Web3EthProvider>
	);
};

export default InitialModals;
