import solution from './solution.json' with { type: 'json' };
import richAccounts from './rich_accounts.json' with { type: 'json' };

import { generateCircomParityProof } from './generator.js';

import axios from 'axios';

async function generateProofVerificationData(address) {
    const levelBoards = solution.levelsBoards || [];
    const userPositions = solution.userPositions || [];

    console.log(`Generating proof for address: ${address}`);
    const verificationData = await generateCircomParityProof(address, userPositions, levelBoards);
    return {
        address: address,
        submit_proof_message: verificationData
    };
}

// Generate the proof verification data for each address
const proofVerificationData = await Promise.all(richAccounts.map(address => generateProofVerificationData(address)));

// Make an HTTP post request to the backend with each address and its proof verification data
const backendUrl = 'http://localhost:4005/proof/';

async function sendProofVerificationData(data) {
    try {
        const startTime = Date.now();
        const response = await axios.post(backendUrl, data);
        const endTime = Date.now();
        console.log(`Response for ${data.address}:`, response.data);
        console.log(`Time taken: ${endTime - startTime} ms`);
    } catch (error) {
        console.error(`Error for ${data.address}:`, error);
    }
}

// Send proof verification data for each account
proofVerificationData.forEach(data => {
    sendProofVerificationData(data);
});

// Measure the time taken for each request and log it to the console

