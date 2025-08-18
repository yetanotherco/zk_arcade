import React, { useEffect } from "react";
import { useModal } from "../../hooks";
import { Modal } from "../../components/Modal";
import { Button } from "../../components";
import { DepositOnAlignedModal } from "../../components/Modal/DepositOnAligned";
import { Address } from "../../types/blockchain";

type Props = {
    payment_service_address: Address;
    user_address: Address;
};

export const EncourageDepositingModal = ({payment_service_address, user_address}: Props) => {
    const { open, setOpen } = useModal(true);
    const { open: depositOpen, setOpen: setDepositOpen, toggleOpen } = useModal();

    console.log("Modal state:", open);

  return (
        <Modal
            open={open}
            setOpen={setOpen}
            maxWidth={600}
        >
                <div className="bg-contrast-100 p-10 rounded flex flex-col gap-8">
                    <div className="text-center">
                        <p className="text-text-100">
                            To play zk-arcade, you need to deposit some funds into your wallet. This is necessary to submit your proofs to Aligned and claim your points in the LeaderBoard.
                        </p>
                    </div>

                    <div className="text-center justify-between space-x-12">
                        <Button
                            variant="accent-fill"
                            onClick={toggleOpen}
                            className="mt-6"
                        >
                            Deposit funds now
                        </Button>
                        <DepositOnAlignedModal
                            payment_service_address={payment_service_address}
                            user_address={user_address}
                            open={depositOpen}
                            setOpen={setDepositOpen}
                        />


                        <Button
                            variant="text-accent"
                            onClick={() => setOpen(false)}
                            className="mt-6 border border-accent-100 px-5 py-2 rounded"
                        >
                            I'll deposit later
                        </Button>
                    </div>
                </div>
        </Modal>
  );
};

