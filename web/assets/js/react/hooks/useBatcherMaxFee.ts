import { useEffect, useState } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor2';
import { hexToBigInt } from "viem";

type GetLastMaxFeeFromBatcherResponse = {
	ProtocolVersion: string,
	LastMaxFee: `0x${string}`;
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
					const data = cborDecode<GetLastMaxFeeFromBatcherResponse>(new Uint8Array(cbor_data));

					if (data?.ProtocolVersion) {
						const message = { GetLastMaxFee: address };
						const encoded = cborEncode(message).buffer;
						ws?.send(encoded);
					} else if (data?.LastMaxFee) {
						ws?.close();
						setMaxFee(hexToBigInt(data.LastMaxFee));
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

		return () => {
			ws?.close();
		};
	}, [batcher_url, address]);

	return { maxFee, isLoading, error };
}
