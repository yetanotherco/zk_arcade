import { useEffect, useState } from "react";
import { Address } from "viem";

type PendingProofsToBump = {
	id: string;
	status: string;
	inserted_at: string;
	updated_at: string;
}[];

const fetchProofsToBump = async (
	address: Address
): Promise<PendingProofsToBump | null> => {
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
	const [proofsToBump, setProofsToBump] = useState<PendingProofsToBump>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isError, setIsError] = useState(false);

	useEffect(() => {
		const fn = async () => {
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

		fn();
	}, [setIsLoading, setProofsToBump]);

	return {
		proofsToBump,
		isError,
		isLoading,
	};
};
