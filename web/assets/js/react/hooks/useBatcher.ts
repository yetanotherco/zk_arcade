import { useEffect, useState, useCallback } from "react";
import { encode as cborEncode, decode as cborDecode } from 'cbor-web';

export function useBatcherNonce(host: string, port: number, address: string) {
	return useCallback(() => {
		return new Promise<`0x${string}`>((resolve, reject) => {
			const ws = new WebSocket(`ws://${host}:${port}`);
			ws.binaryType = 'arraybuffer';

			ws.onopen = () => {
				console.log("WebSocket connection established");
			};

			ws.onmessage = (event) => {
				try {
					const cbor_data = event.data;
					const data = cborDecode(new Uint8Array(cbor_data));

					if (data?.ProtocolVersion) {
						console.log(`Protocol version received: ${data.ProtocolVersion}`);
						const message = { GetNonceForAddress: address };
						const encoded = cborEncode(message).buffer;
						ws.send(encoded);
					} else if (data?.Nonce) {
						ws.close();
						resolve(data.Nonce);
					} else if (data?.EthRpcError || data?.InvalidRequest) {
						ws.close();
						reject(new Error(JSON.stringify(data)));
					}
				} catch (e) {
					ws.close();
					reject(e);
				}
			};

			ws.onerror = () => {
				ws.close();
				reject(new Error("WebSocket connection error"));
			};
		});
	}, [host, port, address]);
}
