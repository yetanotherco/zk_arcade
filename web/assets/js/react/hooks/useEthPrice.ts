import { useEffect, useState } from "react";

export const useEthPrice = () => {
	const [price, setPrice] = useState<number | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPrice = async () => {
		try {
			setLoading(true);
			const response = await fetch(
				"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
			);
			if (!response.ok) {
				return;
			}
			const data = await response.json();
			setPrice(data?.ethereum?.usd ?? null);
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
