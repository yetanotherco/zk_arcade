import { fetch } from "undici";
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';

import solution from '../data/solution.json' with { type: 'json' };
import rawRichAccounts from '../data/rich_accounts.json' with { type: 'json' };

import fs from 'fs/promises';
import { parse } from 'csv-parse';

import { generateCircomParityProof } from './circom_proof_generator.js';
import signMessageFromPrivateKey from './utils/sign_agreement.js';
import { CookieJar, getSetCookies } from './utils/cookie_utils.js';
import { depositIntoAligned } from './aligned.js';

import { ZK_ARCADE_URL, USED_CHAIN } from './constants.js';

const DEPOSIT_WAIT_MS = 10_000;

function normalizeAccounts(raw) {
    if (!Array.isArray(raw)) {
        throw new Error('rich_accounts.json must be an array');
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

async function generateProofVerificationData(address, privateKey, idx) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    if (idx % 100 === 0) {
        console.log(`[${address} - ${idx}] Generating proof...`);
    }
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards, privateKey, idx);
    return {
        submit_proof_message: verificationData,
        game: "Parity",
        game_idx: 112, // Note: to be able to submit the same proof multiple times for testing, this value should change on each run
    };
}

async function createNewSession(jar) {
    try {
        // Tries to get the CSRF token from the main page headers
        const homeRes = await fetch(`${ZK_ARCADE_URL}/`, { method: "GET" });
        if (homeRes.ok) {
            jar.absorb(getSetCookies(homeRes));
            const htmlContent = await homeRes.text();
            
            const csrfMatch = htmlContent.match(/csrf-token["']\s*content=["']([^"']+)["']/i);
            if (csrfMatch && csrfMatch[1]) {
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

async function getAgreementStatus(jar, address) {
    const res = await fetch(`${ZK_ARCADE_URL}/api/wallet/${address}/agreement-status`, {
        method: 'GET',
        headers: {
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

async function createSessionForAccount({ address, privateKey }, idx) {
    const jar = new CookieJar();
    try {
        const { csrf_token } = await createNewSession(jar);

        if (idx % 100 === 0) {
            console.log(`[${address} - ${idx}] Obtained CSRF token after new session.`);
        }
        return { address, privateKey, idx, jar, csrf_token, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in session creation:`, err);
        return { address, privateKey, idx, ok: false, error: String(err) };
    }
}

async function signAgreementForAccount(sessionData) {
    const { address, idx, jar, csrf_token } = sessionData;
    if (!sessionData.ok) return sessionData;
    
    try {
        const signature = await signMessageFromPrivateKey(sessionData.privateKey);
        await doSignPost(jar, csrf_token, {
            address,
            signature,
            _csrf_token: csrf_token,
        });
        if (idx % 100 === 0) {
            console.log(`[${address} - ${idx}] Signed service agreement`);
        }
        return { ...sessionData, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in signing:`, err);
        return { ...sessionData, ok: false, error: String(err) };
    }
}

async function handleDepositForAccount(sessionData) {
    const { address, idx } = sessionData;
    if (!sessionData.ok) return sessionData;
    
    try {
        if (USED_CHAIN.id === sepolia.id) {
            if (idx % 100 === 0) {
                console.log(`[${address} - ${idx}] Deposit skipped (Sepolia)`);
            }
        } else {
            await depositIntoAligned(sessionData.privateKey);
            if (idx % 100 === 0) {
                console.log(`[${address} - ${idx}] Deposit dispatched. Waiting ${DEPOSIT_WAIT_MS / 1000}s for the deposit to be processed...`);
            }
            await new Promise((r) => setTimeout(r, DEPOSIT_WAIT_MS));
        }
        return { ...sessionData, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in deposit:`, err);
        return { ...sessionData, ok: false, error: String(err) };
    }
}

async function checkAgreementForAccount(sessionData) {
    const { address, idx, jar } = sessionData;
    if (!sessionData.ok) return sessionData;
    
    try {
        const status = await getAgreementStatus(jar, address);
        if (idx % 100 === 0) {
            console.log(`[${address} - ${idx}] Fetched agreement status to keep the session alive.`);
        }
        return { ...sessionData, status, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in agreement check:`, err);
        return { ...sessionData, ok: false, error: String(err) };
    }
}

async function generateProofForAccount(sessionData) {
    const { address, idx, csrf_token } = sessionData;
    if (!sessionData.ok) return sessionData;
    
    try {
        const proofData = await generateProofVerificationData(address, sessionData.privateKey, idx);
        const params = {
            ...proofData,
            _csrf_token: csrf_token
        };
        if (idx % 100 === 0) {
            console.log(`[${address} - ${idx}] Generated proof, sending it to the server...`);
        }
        return { ...sessionData, proofParams: params, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in proof generation:`, err);
        return { ...sessionData, ok: false, error: String(err) };
    }
}

async function submitProofForAccount(sessionData) {
    const { address, idx, jar, csrf_token, proofParams } = sessionData;
    if (!sessionData.ok) return sessionData;
    
    try {
        const submitResp = await doSubmitPost(jar, csrf_token, proofParams);
        if (idx % 100 === 0) {
            console.log(`[${address} - ${idx}] Proof submitted successfully`);
        }
        return { ...sessionData, submitResp, ok: true };
    } catch (err) {
        console.error(`[${address} - ${idx}] ERROR in proof submission:`, err);
        return { ...sessionData, ok: false, error: String(err) };
    }
}

// Executes all accounts step by step, waiting for all accounts to complete each step
async function runBatch(accounts) {
    console.log(`Starting stress test with ${accounts.length} accounts...`);
    
    // Initialize account data with private keys
    let accountsData = accounts.map((acc, idx) => ({
        ...acc,
        idx,
        ok: true
    }));

    // Step 1: Create sessions for all accounts
    console.log('\n=== STEP 1: Creating sessions for all accounts ===');
    // Introduce a small jitter to avoid overwhelming the server
    const sessionPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(createSessionForAccount(acc, idx)), jitter));
    });
    accountsData = await Promise.all(sessionPromises);
    
    const successfulSessions = accountsData.filter(acc => acc.ok).length;
    console.log(`Session creation completed: ${successfulSessions}/${accountsData.length} successful`);

    // Step 2: Sign agreements for all accounts with successful sessions
    console.log('\n=== STEP 2: Signing agreements for all accounts ===');
    // Introduce a small jitter to avoid overwhelming the server
    const signPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(signAgreementForAccount(acc)), jitter));
    });
    accountsData = await Promise.all(signPromises);

    const successfulSigns = accountsData.filter(acc => acc.ok).length;
    console.log(`Agreement signing completed: ${successfulSigns}/${accountsData.length} successful`);

    // Step 3: Handle deposits for all accounts
    console.log('\n=== STEP 3: Handling deposits for all accounts ===');
    const depositPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(handleDepositForAccount(acc)), jitter));
    });
    accountsData = await Promise.all(depositPromises);
    
    const successfulDeposits = accountsData.filter(acc => acc.ok).length;
    console.log(`Deposit handling completed: ${successfulDeposits}/${accountsData.length} successful`);

    // Step 4: Check agreement status for all accounts
    console.log('\n=== STEP 4: Checking agreement status for all accounts ===');
    const statusPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(checkAgreementForAccount(acc)), jitter));
    });
    accountsData = await Promise.all(statusPromises);
    
    const successfulStatuses = accountsData.filter(acc => acc.ok).length;
    console.log(`Agreement status check completed: ${successfulStatuses}/${accountsData.length} successful`);

    // Step 5: Generate proofs for all accounts
    console.log('\n=== STEP 5: Generating proofs for all accounts ===');
    const proofPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(generateProofForAccount(acc)), jitter));
    });
    accountsData = await Promise.all(proofPromises);
    
    const successfulProofs = accountsData.filter(acc => acc.ok).length;
    console.log(`Proof generation completed: ${successfulProofs}/${accountsData.length} successful`);

    // Step 6: Submit proofs for all accounts
    console.log('\n=== STEP 6: Submitting proofs for all accounts ===');
    const submitPromises = accountsData.map((acc, idx) => {
        const jitter = Math.random() * 3000;
        return new Promise(resolve => setTimeout(() => resolve(submitProofForAccount(acc)), jitter));
    });
    accountsData = await Promise.all(submitPromises);
    
    const successfulSubmissions = accountsData.filter(acc => acc.ok).length;
    console.log(`Proof submission completed: ${successfulSubmissions}/${accountsData.length} successful`);

    // Convert to the expected result format
    return accountsData.map(acc => ({
        address: acc.address,
        ok: acc.ok,
        error: acc.error,
        status: acc.status,
        submitResp: acc.submitResp
    }));
}

(async () => {
    // Read accounts from the file named sepolia_rich_accounts.csv, if present
    // Fallback to rich_accounts.json if the CSV is not present or empty
    const csvData = await new Promise(async (resolve, reject) => {
        const records = [];

        const content = await fs.readFile('data/sepolia_rich_accounts.csv', 'utf-8');
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
        console.warn("No accounts found to run the stress test. Using fallback rich_accounts.json");
        accounts = normalizeAccounts(rawRichAccounts);
    }

    const results = await runBatch(accounts);

    const summary = {
        total: results.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        failedAddresses: results.filter((r) => !r.ok).map((r) => r.address),
    };
    
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`Total accounts: ${summary.total}`);
    console.log(`Successful completions: ${summary.success}`);
    console.log(`Failed completions: ${summary.failed}`);
    
    if (summary.failed > 0) {
        console.log('\nFailed accounts:');
        for (const r of results.filter(r => !r.ok)) {
            console.log(`  ${r.address}: ${r.error}`);
        }
    }
})().catch(err => {
    console.error("Fatal error in batch run:", err);
    process.exit(1);
});
