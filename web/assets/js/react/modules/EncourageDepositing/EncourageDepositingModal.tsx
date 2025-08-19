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
};

export const EncourageDepositingModal = ({payment_service_address, user_address}: Props) => {
    const { open: encourageOpen, setOpen: setEncourageOpen } = useModal(false);
    const { open: depositOpen, setOpen: setDepositOpen } = useModal();

    useEffect(() => {
        const checkAndOpenModal = () => {
            const viewedHowItWorks = JSON.parse(
                localStorage.getItem("how-it-works-viewed") || "false"
            );
            const viewedEncourageDepositing = JSON.parse(
                localStorage.getItem("encourage-depositing-viewed") || "false"
            );

            if (viewedHowItWorks && !viewedEncourageDepositing) {
                setEncourageOpen(true);
            }
        };

        checkAndOpenModal();

        const handleStorageChange = (e) => {
            if (e.key === "how-it-works-viewed") {
                checkAndOpenModal();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        const interval = setInterval(checkAndOpenModal, 600);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [setEncourageOpen]);

    const handleCloseModal = () => {
        localStorage.setItem("encourage-depositing-viewed", "true");
        setEncourageOpen(false);
    };

    const handleDepositNow = () => {
        localStorage.setItem("encourage-depositing-viewed", "true");
        setEncourageOpen(false);
        setDepositOpen(true);
    };

	const { balance } = useBatcherPaymentService({
		contractAddress: payment_service_address,
		userAddress: user_address,
	});

    const notEnoughBalance = balance.data != undefined && balance.data < BigInt(100000000000000); // 0.0001 ETH

    return (
        <div>
            {notEnoughBalance === true && (
                <Modal
                    open={encourageOpen}
                    setOpen={setEncourageOpen}
                    maxWidth={600}
                    onClose={handleCloseModal}
                >
                    <div className="bg-contrast-100 p-10 rounded flex flex-col gap-8">
                        <div className="text-center">
                            <p className="text-text-100">
                                To play zk-arcade, you need to deposit some funds into your wallet. This is necessary to submit your proofs to Aligned and claim your points in the LeaderBoard.
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
                                Deposit funds now
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
