import solution from './solution.json' with { type: 'json' };
import richAccountPrivateKeys from './rich_accounts.json' with { type: 'json' };
import signMessageFromPrivateKey from './sign_agreement.js';

import { generateCircomParityProof } from './generator.js';
import { CookieJar, getSetCookies } from './cookie_utils.js';
import { depositIntoAligned } from './deposit_into_aligned.js';

import { fetch } from "undici";
import { privateKeyToAccount } from 'viem/accounts';

const baseUrl = "http://localhost:4005";
const CONCURRENCY = 5;
const DEPOSIT_WAIT_MS = 10_000;

async function generateProofVerificationData(privateKey) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    const address = privateKeyToAccount(privateKey).address;
    console.log(`[${address}] Generating proof...`);
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards, privateKey);
    return {
        submit_proof_message: verificationData,
        game: "Parity",
        game_idx: 0,
    };
}

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
        throw new Error(`POST /wallet/sign ${res.status} ${res.statusText} ${text.slice(0,200)}`);
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
        throw new Error(`POST /proof ${res.status} ${res.statusText} ${text.slice(0,200)}`);
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

// Executes the full flow for a single private key
async function runForPrivateKey(privateKey) {
    const address = privateKeyToAccount(privateKey).address;
    const jar = new CookieJar();

    try {
        // 1) New session + CSRF
        const { csrf_token } = await newSession(jar);
        console.log(`[${address}] Session OK. Cookie: ${jar.toHeader()} CSRF: ${csrf_token}`);

        // 2) Sign
        const signature = await signMessageFromPrivateKey(privateKey);
        const signResp = await doSignPost(jar, csrf_token, {
            address,
            signature,
            _csrf_token: csrf_token,
        });
        console.log(`[${address}] /wallet/sign →`, signResp);

        // 3) Deposit
        await depositIntoAligned(privateKey);
        console.log(`[${address}] Deposit dispatched. Waiting ${DEPOSIT_WAIT_MS/1000}s...`);
        await new Promise(r => setTimeout(r, DEPOSIT_WAIT_MS));

        // 4) Agreement status
        const status = await getAgreementStatus(jar, csrf_token, address);
        console.log(`[${address}] Agreement status:`, status);

        // 5) Proof submission
        const proofData = await generateProofVerificationData(privateKey);
        const params = {
            ...proofData,
            _csrf_token: csrf_token
        };
        console.log(`[${address}] Sending proof...`);
        const submitResp = await doSubmitPost(jar, csrf_token, params);
        console.log(`[${address}] /proof →`, submitResp);

        return { address, ok: true, status, submitResp };
    } catch (err) {
        console.error(`[${address}] ERROR:`, err);
        return { address, ok: false, error: String(err) };
    }
}

// Executes in parallel with simple concurrency limit by batches
async function runBatch(keys, concurrency = CONCURRENCY) {
    const results = [];
    for (let i = 0; i < keys.length; i += concurrency) {
        const batch = keys.slice(i, i + concurrency);

        const withJitter = batch.map(async (k, idx) => {
            await new Promise(r => setTimeout(r, Math.random() * 250 + idx * 10));
            return runForPrivateKey(k);
        });

        const batchResults = await Promise.allSettled(withJitter);
        for (const r of batchResults) {
            if (r.status === 'fulfilled') results.push(r.value);
            else results.push({ address: 'unknown', ok: false, error: String(r.reason) });
        }
    }
    return results;
}

(async () => {
    console.log(`Launching stress run for ${richAccountPrivateKeys.length} accounts with concurrency=${CONCURRENCY}`);
    const results = await runBatch(richAccountPrivateKeys, CONCURRENCY);

    const summary = {
        total: results.length,
        success: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        failedAddresses: results.filter(r => !r.ok).map(r => r.address),
    };
    console.log('SUMMARY:', summary);

    for (const r of results) {
        console.log(`[${r.address}] → ${r.ok ? 'OK' : `FAIL: ${r.error}`}`);
    }
})().catch(err => {
    console.error("Fatal error in batch run:", err);
    process.exit(1);
});
