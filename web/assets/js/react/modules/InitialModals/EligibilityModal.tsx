import React, { useEffect } from "react";
import { useModal } from "../../hooks";
import { useNftContract } from "../../hooks/useNftContract";
import { Address } from "../../types/blockchain";
import { EligibilityModal } from "../../components/Modal/EligibilityModal";

type Props = {
	user_address: Address;
	nft_contract_address: Address;
	isEligible: boolean;
};

const getUserViewedMap = (key: string): Record<string, boolean> => {
	try {
		return JSON.parse(localStorage.getItem(key) || "{}");
	} catch {
		return {};
	}
};

const setUserViewed = (
	key: string,
	userAddress: string,
	viewed: boolean
): void => {
	const viewedMap = getUserViewedMap(key);
	viewedMap[userAddress] = viewed;
	localStorage.setItem(key, JSON.stringify(viewedMap));
};

const hasUserViewed = (key: string, userAddress: string): boolean => {
	const viewedMap = getUserViewedMap(key);
	return viewedMap[userAddress] === true;
};

export const ShowEligibilityModal = ({
	user_address,
	nft_contract_address,
	isEligible,
}: Props) => {
	const { open, setOpen } = useModal();
	const { balance, claimNft, receipt } = useNftContract({
		userAddress: user_address,
		contractAddress: nft_contract_address,
	});

	useEffect(() => {
		// if undefined, wait until it is loaded
		if (balance.data === undefined) {
			return;
		}

		const checkAndOpenModal = () => {
			const viewedHowItWorks = JSON.parse(
				localStorage.getItem("how-it-works-viewed") || "false"
			);
			const viewedEligibility = hasUserViewed(
				"eligibility-viewed",
				user_address
			);

			if (viewedHowItWorks && !viewedEligibility && balance.data === 0n) {
				setOpen(true);
			}
		};

		checkAndOpenModal();

		const handleStorageChange = (e: StorageEvent) => {
			if (e.key === "how-it-works-viewed") {
				checkAndOpenModal();
			}
		};

		window.addEventListener("storage", handleStorageChange);
		const interval = setInterval(checkAndOpenModal, 600);

		return () => {
			window.removeEventListener("storage", handleStorageChange);
			clearInterval(interval);
		};
	}, [setOpen, user_address, balance]);

	const dismiss = () => {
		setUserViewed("eligibility-viewed", user_address, true);
	};

	return (
		<EligibilityModal
			isEligible={isEligible}
			open={open}
			setOpen={setOpen}
			onClose={dismiss}
			claimNft={claimNft}
			balance={balance.data || 0n}
			isLoading={receipt.isLoading}
		/>
	);
};
