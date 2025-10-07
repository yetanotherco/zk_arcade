import { fetch } from "undici";
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import solution from './solution.json' with { type: 'json' };
import rawRichAccounts from './rich_accounts.json' with { type: 'json' };

import fs from 'fs/promises';
import { parse } from 'csv-parse';


import { generateCircomParityProof } from './generator.js';
import signMessageFromPrivateKey from './sign_agreement.js';
import { CookieJar, getSetCookies } from './cookie_utils.js';
import { depositIntoAligned } from './deposit_into_aligned.js';

import { ZK_ARCADE_URL, USED_CHAIN } from './constants.js';

const DEPOSIT_WAIT_MS = 10_000;

function normalizeAccounts(raw) {
    if (!Array.isArray(raw)) {
        throw new Error('rich_accounts.json debe ser un array');
    }

    if (raw.length > 0 && typeof raw[0] === 'string') {
        return raw.map((pk) => {
        const addr = privateKeyToAccount(pk).address;
        return { address: addr, privateKey: pk };
        });
    }

    return raw.map((item, idx) => {
        if (!item || typeof item !== 'object') {
        throw new Error(`Invalid element in rich_accounts.json at index ${idx}`);
        }
        if (!item.privateKey) {
        throw new Error(`Missing privateKey at index ${idx}`);
        }
        const derived = privateKeyToAccount(item.privateKey).address;
        const provided = item.address ?? derived;

        if (item.address && provided.toLowerCase() !== derived.toLowerCase()) {
        console.warn(
            `[WARN] Provided address does not match the derived address from the PK at idx ${idx}.
            provided=${provided} derived=${derived}. Using the derived address.`
        );
        }
        return { address: derived, privateKey: item.privateKey };
    });
}

async function generateProofVerificationData(address, privateKey) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    console.log(`[${address}] Generating proof...`);
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards, privateKey);
    return {
        submit_proof_message: verificationData,
        game: "Parity",
        game_idx: 0,
    };
}

async function newSession(jar) {
    try {
        // Tries to get the CSRF token from the main page headers
        const homeRes = await fetch(`${ZK_ARCADE_URL}/`, { method: "GET" });
        if (homeRes.ok) {
            jar.absorb(getSetCookies(homeRes));
            const htmlContent = await homeRes.text();
            
            const csrfMatch = htmlContent.match(/csrf-token["']\s*content=["']([^"']+)["']/i);
            if (csrfMatch && csrfMatch[1]) {
                console.log("CSRF token obtained from main page");
                return { csrf_token: csrfMatch[1] };
            }
        }
    } catch (error) {
        console.warn("Could not obtain CSRF token from main page:", error.message);
    }

    // If all fails, throw an error instead of using an invalid fallback
    throw new Error("Could not obtain a valid CSRF token. The backend requires CSRF and there is no way to obtain it.");
}

async function doSignPost(jar, csrf_token, payload) {
    const res = await fetch(`${ZK_ARCADE_URL}/wallet/sign`, {
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
    const res = await fetch(`${ZK_ARCADE_URL}/proof/`, {
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

// Executes the full flow for a single private key
async function runForAccount({ address, privateKey }) {
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
        console.log(`[${address}] /wallet/sign: `, signResp);

        // 3) Deposit (skip in sepolia)
        if (USED_CHAIN.id === sepolia.id) {
            console.log(`[${address}] Deposit skipped (Sepolia)`);
        } else {
            await depositIntoAligned(privateKey);
            console.log(`[${address}] Deposit dispatched. Waiting ${DEPOSIT_WAIT_MS / 1000}s...`);
            await new Promise((r) => setTimeout(r, DEPOSIT_WAIT_MS));
        }

        // 4) Proof data generation
        const proofData = await generateProofVerificationData(address, privateKey);
        const params = {
            ...proofData,
            _csrf_token: csrf_token
        };

        // 5) Proof submission
        console.log(`[${address}] Sending proof...`);
        const submitResp = await doSubmitPost(jar, csrf_token, params);

        return { address, ok: true, submitResp };
    } catch (err) {
        console.error(`[${address}] ERROR:`, err);
        return { address, ok: false, error: String(err) };
    }
}

// Executes all accounts in parallel without concurrency limit
async function runBatch(accounts) {
    // Add a small random jitter to avoid bursts
    const withJitter = accounts.map(async (acc, idx) => {
        await new Promise((r) => setTimeout(r, Math.random() * 250 + idx * 10));
        return runForAccount(acc);
    });

    const results = await Promise.allSettled(withJitter);
    return results.map(r => {
        if (r.status === 'fulfilled') return r.value;
        else return { address: 'unknown', ok: false, error: String(r.reason) };
    });
}

(async () => {
    // Read accounts from the file named sepolia_rich_accounts.csv, if present
    // Fallback to rich_accounts.json if the CSV is not present or empty
    const csvData = await new Promise(async (resolve, reject) => {
        const records = [];

        const content = await fs.readFile('sepolia_rich_accounts.csv', 'utf-8');
        parse(content, {
                columns: true,
                trim: true,
                skip_empty_lines: true,
        })
        .on('data', (data) => records.push(data))
        .on('end', () => resolve(records))
        .on('error', (err) => reject(err));
    });

    let accounts = csvData.map((row, idx) => {
        if (!row.privateKey || !row.address) {
            throw new Error(`Missing privateKey or address in CSV at row ${idx + 1}`);
        }

        return { address: row.address, privateKey: row.privateKey };
    });

    if (accounts.length === 0) {
        console.error("No accounts found to run the stress test. Using fallback rich_accounts.json");
        accounts = normalizeAccounts(rawRichAccounts);
    }

    const results = await runBatch(accounts);

    const summary = {
        total: results.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        failedAddresses: results.filter((r) => !r.ok).map((r) => r.address),
    };
    console.log('SUMMARY:', summary);

    for (const r of results) {
        console.log(`[${r.address}] → ${r.ok ? 'OK' : `FAIL: ${r.error}`}`);
    }
})().catch(err => {
    console.error("Fatal error in batch run:", err);
    process.exit(1);
});
