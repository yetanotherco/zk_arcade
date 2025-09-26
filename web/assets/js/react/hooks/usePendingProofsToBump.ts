import { useEffect, useState } from "react";
import { Address } from "viem";

export type PendingProofToBump = {
	id: string;
	status: string;
	inserted_at: string;
	updated_at: string;
	submitted_max_fee: string;
	game: string;
	level_reached: number;
};

const fetchProofsToBump = async (
	address: Address
): Promise<PendingProofToBump[] | null> => {
	try {
		const response = await fetch(`/proof/pending/?address=${address}`, {
			method: "GET",
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
		});

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data;
	} catch (error) {
		return null;
	}
};

export const usePendingProofsToBump = ({
	user_address,
}: {
	user_address: Address;
}) => {
	const [proofsToBump, setProofsToBump] = useState<PendingProofToBump[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);

	const fetchProofs = async () => {
		try {
			setIsLoading(true);
			const res = await fetchProofsToBump(user_address);
			if (!res) {
				setIsError(true);
				return;
			}
			setProofsToBump(res);
			setIsLoading(false);
		} catch (err) {
			setIsError(true);
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchProofs();
	}, [setIsLoading, setProofsToBump]);

	return {
		proofsToBump,
		isError,
		isLoading,
		refetch: fetchProofs,
	};
};
