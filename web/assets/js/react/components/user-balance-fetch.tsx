import React from "react";
import { useBatcherPaymentService } from "../hooks/useBatcherPaymentService";
import { formatEther } from "viem";
import { Address } from "../types/blockchain";

type Props = {
	contract_address: Address;
	user_address: Address;
};

const UserBalanceFetch = ({ contract_address, user_address }: Props) => {
	const {
		balance: { data: balance, isError, isLoading, error },
	} = useBatcherPaymentService({
		contractAddress: contract_address,
		userAddress: user_address,
	});

	if (isLoading || balance == undefined)
		return <div>Loading user balance...</div>;

	if (isError) {
		return <div>Error fetching user balance: {error?.message}</div>;
	}

	return <div>User Balance: {formatEther(balance)} ETH</div>;
};

export default UserBalanceFetch;
