import solution from './solution.json' with { type: 'json' };
import richAccountPrivateKeys from './rich_accounts.json' with { type: 'json' };
import signMessageFromPrivateKey from './sign_agreement.js';

import { generateCircomParityProof } from './generator.js';

import { fetch } from "undici";
import { privateKeyToAccount } from 'viem/accounts';

async function generateProofVerificationData(privateKey) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    const address = privateKeyToAccount(privateKey).address;
    console.log(`Generating proof for address: ${address}`);
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards);
    return {
        submit_proof_message: verificationData,
        game: "Parity",
        game_idx: 0,
    };
}

const proofVerificationData = await Promise.all(richAccountPrivateKeys.map(privateKey => generateProofVerificationData(privateKey)));


function extractCookie(setCookieHeaders) {
    if (!setCookieHeaders) return "";
    const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    const kv = arr.map(h => h.split(";")[0]).join("; ");
    return kv;
}

async function newSession() {
    const csrfRes = await fetch(`http://localhost:4005/csrf`, { method: "GET" });
    const setCookie = csrfRes.headers.getSetCookie?.() ?? csrfRes.headers.get("set-cookie");
    const cookie = extractCookie(setCookie);
    const { csrf_token } = await csrfRes.json();
    return { cookie, csrf_token };
}

async function doSignPost(cookie, csrf_token, payload) {
    const res = await fetch(`http://localhost:4005/wallet/sign`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf_token,
            "cookie": cookie
        },
        body: JSON.stringify(payload)
    });
    console.log("Sign response:", res);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    return res.json().catch(() => null);
}

async function doSubmitPost(cookie, csrf_token, payload) {
    const res = await fetch(`http://localhost:4005/proof/`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf_token,
            "cookie": cookie
        },
        body: JSON.stringify(payload)
    });
    console.log("Submit response:", res);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    return res.json().catch(() => null);
}

newSession().then(async ({ cookie, csrf_token }) => {
    console.log("New session started. Cookie:", cookie, "CSRF Token:", csrf_token);

    const privateKey = richAccountPrivateKeys[0];
    const signature = await signMessageFromPrivateKey(privateKey);

    const address = privateKeyToAccount(privateKey).address;

    doSignPost(cookie, csrf_token, {
        address: address,
        signature: signature,
        _csrf_token: csrf_token
    }).then(response => {
        console.log("Server response:", response);
    }).catch(err => {
        console.error("Error in POST request:", err);
    });

    console.log("Signed message:", signature);

    const res = await fetch(`http://localhost:4005/api/wallet/${address}/agreement-status`, {
        method: "GET",
        headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf_token,
            "cookie": cookie
        }
    });
    console.log("Submit response:", res);
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }

    const params = {
        submit_proof_message: proofVerificationData[0].submit_proof_message,
        game: "Parity",
        game_idx: 0,
        _csrf_token: csrf_token
    };

    console.log("Sending proof data:", params);
    
    doSubmitPost(cookie, csrf_token, params).then(response => {
        console.log("Server response:", response);
    }).catch(err => {
        console.error("Error in POST request:", err);
    });
}).catch(err => {
    console.error("Error starting new session:", err);
});
