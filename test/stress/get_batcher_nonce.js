
import WebSocket from "ws";
import { encode as cborEncode, decode as cborDecode } from 'cbor2';
import { hexToBigInt } from "viem";

export async function getBatcherNonce(batcher_url, address) {
    return new Promise((resolve, reject) => {
        if (!address) {
            return reject(new Error("No address provided"));
        }

        const ws = new WebSocket(batcher_url);
        ws.binaryType = "arraybuffer";

        ws.onopen = () => {
            console.log(`[${address} - ${idx}] Established connection to the batcher to get nonce`);
        };

        ws.onmessage = (event) => {
        try {
            const cbor_data = event.data;
            const data = cborDecode(new Uint8Array(cbor_data));

            if (data?.ProtocolVersion) {
                const message = { GetNonceForAddress: address };
                const encoded = cborEncode(message).buffer;
                ws.send(encoded);
            } else if (data?.Nonce) {
                ws.close();
                resolve(hexToBigInt(data.Nonce));
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

        ws.onclose = () => {};
    });
}
