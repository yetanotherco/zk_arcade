import React, { useEffect } from "react";
import { useModal } from "../../hooks";
import { Modal } from "../../components/Modal";
import { Button } from "../../components";
import { DepositOnAlignedModal } from "../../components/Modal/DepositOnAligned";
import { Address } from "../../types/blockchain";
import { useBatcherPaymentService } from "../../hooks";

type Props = {
	payment_service_address: Address;
	user_address: Address;
	blocked?: boolean;
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

export const EncourageDepositingModal = ({
	payment_service_address,
	user_address,
	blocked = false,
}: Props) => {
	const { open: encourageOpen, setOpen: setEncourageOpen } = useModal(false);
	const { open: depositOpen, setOpen: setDepositOpen } = useModal();

	useEffect(() => {
		const checkAndOpenModal = () => {
			if (blocked) return;

			const viewedEncourageDepositing = hasUserViewed(
				"encourage-depositing-viewed",
				user_address
			);

			if (!viewedEncourageDepositing) {
				setEncourageOpen(true);
			}
		};

		checkAndOpenModal();
	}, [setEncourageOpen, user_address, blocked]);

	const handleCloseModal = () => {
		setUserViewed("encourage-depositing-viewed", user_address, true);
		setEncourageOpen(false);
	};

	const handleDepositNow = () => {
		setUserViewed("encourage-depositing-viewed", user_address, true);
		setDepositOpen(true);
	};

	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

	const notEnoughBalance =
		balance.data != undefined && balance.data < BigInt(100000000000000); // 0.0001 ETH

	return (
		<div>
			{notEnoughBalance && (
				<Modal
					open={encourageOpen}
					setOpen={setEncourageOpen}
					maxWidth={600}
					shouldCloseOnEsc={false}
					shouldCloseOnOutsideClick={false}
					showCloseButton={false}
				>
					<div className="bg-contrast-100 p-10 rounded flex flex-col gap-8">
						<div className="text-center">
							<p className="text-text-100">
								To play ZK Arcade, you need to deposit some ETH
								into Aligned. This is necessary to verify your
								proofs.
							</p>
						</div>

						<div className="text-center justify-between space-x-12">
							<Button
								variant="text"
								onClick={handleCloseModal}
								className="mt-6"
							>
								I'll deposit later
							</Button>

							<Button
								variant="accent-fill"
								onClick={handleDepositNow}
								className="mt-6"
							>
								Deposit now
							</Button>
						</div>
					</div>
				</Modal>
			)}

			<DepositOnAlignedModal
				payment_service_address={payment_service_address}
				user_address={user_address}
				open={depositOpen}
				setOpen={setDepositOpen}
			/>
		</div>
	);
};
