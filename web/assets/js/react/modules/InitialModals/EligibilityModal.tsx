// src/pages/EncourageDepositing/EligibilityModal.tsx
import React, { useEffect } from "react";
import { useModal } from "../../hooks";
import { Modal } from "../../components/Modal";
import { Button } from "../../components";
import { Address } from "../../types/blockchain";

type Props = {
	user_address: Address;
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

export const EligibilityModal = ({ user_address, isEligible }: Props) => {
	const { open, setOpen } = useModal();

	useEffect(() => {
		const checkAndOpenModal = () => {
			const viewedHowItWorks = JSON.parse(
				localStorage.getItem("how-it-works-viewed") || "false"
			);
			const viewedEligibility = hasUserViewed(
				"eligibility-viewed",
				user_address
			);

			if (viewedHowItWorks && !viewedEligibility) {
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
	}, [setOpen, user_address]);

	const dismiss = () => {
		setUserViewed("eligibility-viewed", user_address, true);
		setOpen(false);
	};

	return (
		<Modal
			open={open}
			setOpen={setOpen}
			maxWidth={560}
			shouldCloseOnEsc={false}
			shouldCloseOnOutsideClick={false}
			showCloseButton={false}
		>
			<div className="bg-contrast-100 p-10 rounded flex flex-col gap-6">
				{isEligible ? (
					<>
						<h3 className="text-xl font-semibold text-center">
							You’re eligible 🎉
						</h3>
						<p className="text-text-100 text-center">
							Your wallet is eligible to play and claim rewards.
							Have fun!
						</p>
						<div className="text-center">
							<Button
								variant="accent-fill"
								onClick={dismiss}
								className="mt-4"
							>
								Let’s go
							</Button>
						</div>
					</>
				) : (
					<>
						<h3 className="text-xl font-semibold text-center">
							Not eligible yet
						</h3>
						<p className="text-text-100 text-center">
							This wallet isn’t eligible to participate right now.
						</p>
						<div className="text-center">
							<Button
								variant="accent-fill"
								onClick={dismiss}
								className="mt-4"
							>
								Ok
							</Button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};
