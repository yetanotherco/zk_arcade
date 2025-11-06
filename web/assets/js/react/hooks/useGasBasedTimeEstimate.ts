import { useEffect, useState } from "react";

interface TimeEstimate {
  estimatedTime: string;
  gasPriceGwei: number | null;
}

export const useGasBasedTimeEstimate = () => {
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate>({
    estimatedTime: "15-30 minutes",
    gasPriceGwei: null
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const deriveTimeEstimateString = (gasPriceGwei: number): string => {
    if (gasPriceGwei <= 0.5) {
      return "5 min";
    } else if (gasPriceGwei <= 1.5) {
      return "15 min";
    } else if (gasPriceGwei <= 3) {
      return "30 min";
    } else if (gasPriceGwei <= 6) {
      return "60 min";
    } else if (gasPriceGwei <= 12) {
      return "2 hours";
    } else if (gasPriceGwei <= 24) {
      return "4 hours";
    } else {
      return "more than 4 hours";
    }
  };

  const fetchGasPriceAndEstimate = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/gasprice");
      if (!response.ok) {
        throw new Error("Failed to fetch gas price");
      }
      const data = await response.json();
      if (data?.gas_price_gwei) {
        const estimatedTime = deriveTimeEstimateString(data.gas_price_gwei);
        setTimeEstimate({
          estimatedTime,
          gasPriceGwei: data.gas_price_gwei
        });
      }
      setError(null);
    } catch (err) {
      setError("Failed to fetch gas price");
      // Set fallback estimate on error
      setTimeEstimate({
        estimatedTime: "15-30 minutes",
        gasPriceGwei: null
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGasPriceAndEstimate();
    const interval = setInterval(fetchGasPriceAndEstimate, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getTimeEstimateText = (): string => {
    return timeEstimate.estimatedTime;
  };

  const getDetailedTimeEstimateText = (): string => {
    const { estimatedTime } = timeEstimate;
    return `${estimatedTime}`;
  };

  return {
    timeEstimate,
    loading,
    error,
    getTimeEstimateText,
    getDetailedTimeEstimateText
  };
};
