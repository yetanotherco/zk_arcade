import React from "react";
import { Address } from "../../types/blockchain";
import Web3EthProvider from "../../providers/web3-eth-provider";
import { ToastsProvider } from "../../state/toast";
import { ToastContainer } from "../../components/Toast";
import { EncourageDepositingModal } from "./EncourageDepositingModal";

type Props = {
    network: string;
    payment_service_address: Address;
    user_address: Address;
};

const EncourageDepositing = ({
    network,
    payment_service_address,
    user_address,
}: Props) => {
    return (
        <Web3EthProvider network={network}>
            <ToastsProvider>
                <ToastContainer />
                <EncourageDepositingModal
                    payment_service_address={payment_service_address}
                    user_address={user_address}
                />
            </ToastsProvider>
        </Web3EthProvider>
    );
};

export default EncourageDepositing;
