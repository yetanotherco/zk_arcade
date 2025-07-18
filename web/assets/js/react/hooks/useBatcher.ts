import { useEffect, useState } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor-web';

export function useBatcherNonce(host: string, port: number, address: string) {
	const [nonce, setNonce] = useState<`0x${string}` | null>(null);
	const [error, setError] = useState<Error | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let ws: WebSocket | null = null;

		const fetchNonce = () => {
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
						setNonce(data.Nonce);
						setLoading(false);
					} else if (data?.EthRpcError || data?.InvalidRequest) {
						ws?.close();
						setError(new Error(JSON.stringify(data)));
						setLoading(false);
					}
				} catch (e) {
					ws?.close();
					setError(e as Error);
					setLoading(false);
				}
			};

			ws.onerror = () => {
				ws?.close();
				setError(new Error("WebSocket connection error"));
				setLoading(false);
			};
		};

		fetchNonce();

		return () => {
			ws?.close();
		};
	}, [host, port, address]);

	return { nonce, loading, error };
}
