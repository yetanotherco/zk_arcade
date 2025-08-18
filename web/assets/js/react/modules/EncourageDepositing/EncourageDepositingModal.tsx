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
    const { open: encourageOpen, setOpen: setEncourageOpen } = useModal(true);
    const { open: depositOpen, setOpen: setDepositOpen } = useModal();

    console.log("Modal state:", encourageOpen);

  return (
    <div>
        <Modal
            open={encourageOpen}
            setOpen={setEncourageOpen}
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
                            variant="text"
                            onClick={() => setEncourageOpen(false)}
                            className="mt-6"
                        >
                            I'll deposit later
                        </Button>

                        <Button
                            variant="accent-fill"
                            onClick={() => { setEncourageOpen(false); setDepositOpen(true); }}
                            className="mt-6"
                        >
                            Deposit funds now
                        </Button>
                    </div>
                </div>
        </Modal>

        <DepositOnAlignedModal
            payment_service_address={payment_service_address}
            user_address={user_address}
            open={depositOpen}
            setOpen={setDepositOpen}
        />
    </div>
  );
};

