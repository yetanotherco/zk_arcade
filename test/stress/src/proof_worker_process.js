#!/usr/bin/env node
import { generateCircomParityProof } from './circom_proof_generator.js';

// Listen for messages from parent process
process.on('message', async (data) => {
    const { address, privateKey, userPositions, levelsBoards, idx } = data;
    
    try {
        const result = await generateCircomParityProof(
            address,
            userPositions,
            levelsBoards,
            privateKey,
            idx
        );
        
        process.send({
            success: true,
            result,
            address,
            idx
        });
    } catch (error) {
        process.send({
            success: false,
            error: error.message,
            address,
            idx
        });
    }
});

// Handle process termination gracefully
process.on('SIGTERM', () => {
    process.exit(0);
});

process.on('SIGINT', () => {
    process.exit(0);
});
