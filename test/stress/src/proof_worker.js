import { parentPort } from 'node:worker_threads';

// Set up environment for snarkjs/web-worker compatibility
global.threads = {
    workerData: null,
    worker: {
        parentPort: null
    }
};

parentPort.on('message', async (data) => {
    const { address, privateKey, userPositions, levelsBoards, idx } = data;
    
    try {
        // Import the proof generator dynamically to avoid web-worker conflicts at startup
        const { generateCircomParityProof } = await import('./circom_proof_generator.js');
        
        const result = await generateCircomParityProof(
            address,
            userPositions,
            levelsBoards,
            privateKey,
            idx
        );
        
        parentPort.postMessage({
            success: true,
            result,
            address,
            idx
        });
    } catch (error) {
        parentPort.postMessage({
            success: false,
            error: error.message,
            address,
            idx
        });
    }
});
