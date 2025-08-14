import { useEffect, useState } from "react";

export const useEthPrice = () => {
	const [price, setPrice] = useState<number | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPrice = async () => {
		try {
			setLoading(true);
			const response = await fetch("/api/ethprice");
			if (!response.ok) {
				return;
			}
			const data = await response.json();
			if (data?.eth_price) {
				setPrice(data.eth_price);
			}
			setError(null);
		} catch (err) {
			setError("Failed to fetch ETH price");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPrice();
		const interval = setInterval(fetchPrice, 60000); // refresh every 60s
		return () => clearInterval(interval);
	}, []);

	return { price, loading, error };
};
