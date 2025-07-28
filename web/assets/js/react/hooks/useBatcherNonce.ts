import { useEffect, useState } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor2';
import { hexToBigInt } from "viem";

type GetNonceFromBatcherResponse = {
	ProtocolVersion: string,
	Nonce: `0x${string}`;
	EthRpcError: string;
	InvalidRequest: string;
}

export function useBatcherNonce(batcher_url: string, address?: string) {
	const [nonce, setNonce] = useState<bigint | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let ws: WebSocket | null = null;

		const fetchNonce = () => {
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
					const data = cborDecode<GetNonceFromBatcherResponse>(new Uint8Array(cbor_data));

					if (data?.ProtocolVersion) {
						const message = { GetNonceForAddress: address };
						const encoded = cborEncode(message).buffer;
						ws?.send(encoded);
					} else if (data?.Nonce) {
						ws?.close();
						setNonce(hexToBigInt(data.Nonce));
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

		fetchNonce();

		return () => {
			ws?.close();
		};
	}, [batcher_url, address]);

	return { nonce, isLoading, error };
}
