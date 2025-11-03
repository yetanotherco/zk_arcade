import { useCallback, useEffect, useState } from "react";

type StopFlagResponse = {
	stop: boolean;
};

export const useProofStopFlag = () => {
	const [stop, setStop] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState(false);

	const fetchFlag = useCallback(async () => {
		try {
			setIsLoading(true);
			const res = await fetch("/proof/stop-flag", {
				headers: { Accept: "application/json" },
				credentials: "include",
			});
			if (!res.ok) throw new Error(`Failed to fetch stop flag`);
			const data: StopFlagResponse = await res.json();
			setStop(data?.stop);
			setError(false);
		} catch (e) {
			setError(false);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchFlag();
	}, [fetchFlag]);

	return { stop, isLoading, error, refetch: fetchFlag };
};
