import React, { useEffect } from "react";
import { useModal } from "../hooks";
import { Modal } from "../components/Modal";
import { Button } from "../components";


export const EncourageDepositingModal = () => {
    const { open, setOpen } = useModal(true);

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
                            onClick={() => setOpen(false)}
                            className="mt-6"
                        >
                            Deposit funds now
                        </Button>

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

