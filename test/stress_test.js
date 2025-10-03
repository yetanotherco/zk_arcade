import solution from './solution.json' with { type: 'json' };
import richAccountPrivateKeys from './rich_accounts.json' with { type: 'json' };
import signMessageFromPrivateKey from './sign_agreement.js';

import { generateCircomParityProof } from './generator.js';
import { CookieJar, getSetCookies } from './cookie_utils.js';
import { depositIntoAligned } from './deposit_into_aligned.js';

import { fetch } from "undici";
import { privateKeyToAccount } from 'viem/accounts';

const baseUrl = "http://localhost:4005";

async function generateProofVerificationData(privateKey) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    const address = privateKeyToAccount(privateKey).address;
    console.log(`Generating proof for address: ${address}`);
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards, privateKey);
    return {
        submit_proof_message: verificationData,
        game: "Parity",
        game_idx: 0,
    };
}

const proofVerificationData = await Promise.all(richAccountPrivateKeys.map(privateKey => generateProofVerificationData(privateKey)));

async function newSession(jar) {
    const csrfRes = await fetch(`${baseUrl}/csrf`, { method: "GET" });
    jar.absorb(getSetCookies(csrfRes));
    const data = await csrfRes.json();
    return { csrf_token: data.csrf_token };
}

async function doSignPost(jar, csrf_token, payload) {
    const res = await fetch(`${baseUrl}/wallet/sign`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf_token,
            "cookie": jar.toHeader()
        },
        body: JSON.stringify(payload)
    });
    jar.absorb(getSetCookies(res));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    return res.json().catch(() => null);
}

async function doSubmitPost(jar, csrf_token, payload) {
    const res = await fetch(`${baseUrl}/proof/`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "x-csrf-token": csrf_token,
            "cookie": jar.toHeader(),
        },
        body: JSON.stringify(payload)
    });
    jar.absorb(getSetCookies(res));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`POST ${res.status} ${res.statusText} ${text.slice(0,200)}`);
    }
    return res.json().catch(() => null);
}

async function getAgreementStatus(jar, csrf_token, address) {
    const res = await fetch(`${baseUrl}/api/wallet/${address}/agreement-status`, {
        method: 'GET',
        headers: {
            "x-csrf-token": csrf_token,
            "cookie": jar.toHeader(),
        },
    });
    jar.absorb(getSetCookies(res));
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`GET /agreement-status → ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
    }
    return res.json().catch(() => null);
}

(async () => {
    const jar = new CookieJar();
    const { csrf_token } = await newSession(jar);
    console.log('New session initiated. Cookie:', jar.toHeader(), 'CSRF:', csrf_token);

    const privateKey = richAccountPrivateKeys[0];
    const signature = await signMessageFromPrivateKey(privateKey);

    const address = privateKeyToAccount(privateKey).address;

    const signResp = await doSignPost(jar, csrf_token, {
        address,
        signature,
        _csrf_token: csrf_token,
    });
    console.log('Response /wallet/sign:', signResp);

    // Deposit into the batcher
    depositIntoAligned(privateKey).catch((err) => {
        console.error("Error depositing into Aligned:", err);
    });

    console.log("Waiting 10 seconds to ensure deposit is processed...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    const status = await getAgreementStatus(jar, csrf_token, address);
    console.log('Agreement status:', status);

    const params = {
        submit_proof_message: proofVerificationData[0].submit_proof_message,
        game: "Parity",
        game_idx: 0,
        _csrf_token: csrf_token
    };

    console.log("Sending proof data:", params);

    const submitResp = await doSubmitPost(jar, csrf_token, params);
    console.log("Response /proof:", submitResp);
})().catch((err) => {
    console.error("Error in main flow:", err);
    process.exit(1);
});
