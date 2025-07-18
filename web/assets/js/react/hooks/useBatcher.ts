import { useEffect, useState } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor-web';
import { hexToBigInt } from "viem";

export function useBatcherNonce(host: string, port: number, address?: string) {
	const [nonce, setNonce] = useState<bigint | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let ws: WebSocket | null = null;

		const fetchNonce = () => {
			if (!address) {
				return
			}
			
			ws = new WebSocket(`ws://${host}:${port}`);
			ws.binaryType = 'arraybuffer';

			ws.onopen = () => {
				console.log("WebSocket connection established");
			};

			ws.onmessage = (event) => {
				try {
					const cbor_data = event.data;
					const data = cborDecode(new Uint8Array(cbor_data));

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
	}, [host, port, address]);

	return { nonce, isLoading, error };
}
