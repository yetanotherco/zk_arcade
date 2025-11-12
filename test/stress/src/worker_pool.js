import { Worker } from 'node:worker_threads';
import { cpus } from 'os';
import path from 'path';

export class WorkerPool {

    constructor(workerScript, poolSize = cpus().length) {
        this.workerScript = workerScript;
        this.poolSize = poolSize;
        this.workers = [];
        this.taskQueue = [];
        this.activeWorkers = new Set();
        
        this.initialize();
    }
    
    initialize() {
        console.log(`[WorkerPool] Initializing ${this.poolSize} workers...`);
        for (let i = 0; i < this.poolSize; i++) {
            const worker = new Worker(path.resolve(this.workerScript));
            this.workers.push({
                id: i,
                worker,
                busy: false
            });
        }
        console.log(`[WorkerPool] All workers initialized`);
    }
    
    async exec(data) {
        return new Promise((resolve, reject) => {
            const task = { data, resolve, reject };
            

            const availableWorker = this.workers.find(w => !w.busy);
            
            if (availableWorker) {
    
                this.runTask(availableWorker, task);
            } else {
    
                this.taskQueue.push(task);
            }
        });
    }
    
    runTask(workerInfo, task) {
        workerInfo.busy = true;
        this.activeWorkers.add(workerInfo.id);
        
        const { worker } = workerInfo;
        
        const messageHandler = (result) => {
            cleanup();
            if (result.success) {
                task.resolve(result);
            } else {
                task.reject(new Error(result.error));
            }
            

            workerInfo.busy = false;
            this.activeWorkers.delete(workerInfo.id);
            

            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.runTask(workerInfo, nextTask);
            }
        };
        
        const errorHandler = (error) => {
            cleanup();
            task.reject(error);
            workerInfo.busy = false;
            this.activeWorkers.delete(workerInfo.id);
            

            if (this.taskQueue.length > 0) {
                const nextTask = this.taskQueue.shift();
                this.runTask(workerInfo, nextTask);
            }
        };
        
        const cleanup = () => {
            worker.off('message', messageHandler);
            worker.off('error', errorHandler);
        };
        
        worker.once('message', messageHandler);
        worker.once('error', errorHandler);
        
        worker.postMessage(task.data);
    }
    
    async terminate() {
        console.log('[WorkerPool] Terminating all workers...');
        const promises = this.workers.map(w => w.worker.terminate());
        await Promise.all(promises);
        console.log('[WorkerPool] All workers terminated');
    }

    getStats() {
        return {
            poolSize: this.poolSize,
            activeWorkers: this.activeWorkers.size,
            queuedTasks: this.taskQueue.length,
            availableWorkers: this.workers.filter(w => !w.busy).length
        };
    }
}
