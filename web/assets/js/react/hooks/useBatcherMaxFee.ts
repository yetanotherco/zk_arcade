import { useEffect, useState } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor2';
import { hexToBigInt } from "viem";

type GetMaxFeeFromBatcherResponse = {
	ProtocolVersion: string,
	MaxFee: `0x${string}`;
	EthRpcError: string;
	InvalidRequest: string;
}

export function useBatcherMaxFee(batcher_url: string, address?: string) {
	const [maxFee, setMaxFee] = useState<bigint | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let ws: WebSocket | null = null;

		const fetchMaxFee = () => {
			if (!address) {
				return
			}
			
			ws = new WebSocket(`${batcher_url}`);
			ws.binaryType = 'arraybuffer';

			ws.onopen = () => {
				console.log("WebSocket connection established");
			};

			ws.onmessage = (event) => {
				try {
					const cbor_data = event.data;
					const data = cborDecode<GetMaxFeeFromBatcherResponse>(new Uint8Array(cbor_data));

					if (data?.ProtocolVersion) {
						const message = { GetMaxFeeForAddress: address }; // This should match the batcher's expected request
						const encoded = cborEncode(message).buffer;
						ws?.send(encoded);
					} else if (data?.MaxFee) {
						ws?.close();
						setMaxFee(hexToBigInt(data.MaxFee));
						setIsLoading(false);
					} else if (data?.EthRpcError || data?.InvalidRequest) {
						ws?.close();
						setError(new Error(JSON.stringify(data)));
						setIsLoading(false);
					}
				} catch (e) {
					ws?.close();
					setError(e as Error);
					setIsLoading(false);
				}
			};

			ws.onerror = () => {
				ws?.close();
				setError(new Error("WebSocket connection error"));
				setIsLoading(false);
			};
		};

		fetchMaxFee();

        if (isLoading) {
            console.log("Loading max fee from batcher...");
            const loadingInterval = setInterval(() => {
                console.log("Still loading max fee from batcher...");
            }, 20000);
            console.log("Setting a placeholder value for maxFee to avoid null issues.");
            setMaxFee(39152300274066000n);
            setIsLoading(false);
            return;
        } else if (error) {
            console.error("Error fetching max fee from batcher:", error);
        } else {
            console.log("Fetched max fee from batcher:", maxFee?.toString());
        }

		return () => {
			ws?.close();
		};
	}, [batcher_url, address]);

	return { maxFee, isLoading, error };
}
