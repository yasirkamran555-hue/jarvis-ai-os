import { Worker } from 'node:worker_threads';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class WorkerPool {
  constructor(workerScript, poolSize = 4) {
    this.workerScript = workerScript;
    this.poolSize = poolSize;
    this.workers = [];
    this.queue = [];
    this.activeWorkers = new Set();
    this.initializePool();
  }

  initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      this.createWorker(i);
    }
  }

  createWorker(id) {
    const worker = new Worker(this.workerScript, { 
      workerData: { workerId: id }
    });

    worker.on('message', (msg) => {
      this.handleWorkerMessage(worker, msg);
    });

    worker.on('error', (err) => {
      console.error(`Worker ${id} error:`, err);
      this.workers = this.workers.filter(w => w !== worker);
      this.activeWorkers.delete(worker);
      this.processQueue();
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Worker ${id} exited with code ${code}`);
      }
      this.workers = this.workers.filter(w => w !== worker);
      this.activeWorkers.delete(worker);
    });

    this.workers.push(worker);
  }

  async runTask(task) {
    return new Promise((resolve, reject) => {
      const request = { task, resolve, reject };

      const availableWorker = this.workers.find(w => !this.activeWorkers.has(w));

      if (availableWorker) {
        this.executeTask(availableWorker, request);
      } else {
        this.queue.push(request);
      }
    });
  }

  executeTask(worker, request) {
    this.activeWorkers.add(worker);
    worker.currentRequest = request;
    worker.postMessage(request.task);
  }

  handleWorkerMessage(worker, msg) {
    const request = worker.currentRequest;

    if (msg.error) {
      request.reject(new Error(msg.error));
    } else {
      request.resolve(msg);
    }

    this.activeWorkers.delete(worker);
    worker.currentRequest = null;
    this.processQueue();
  }

  processQueue() {
    if (this.queue.length === 0) return;

    const availableWorker = this.workers.find(w => !this.activeWorkers.has(w));
    if (availableWorker) {
      const request = this.queue.shift();
      this.executeTask(availableWorker, request);
    }
  }

  terminate() {
    return Promise.all(this.workers.map(w => w.terminate()));
  }

  getStats() {
    return {
      totalWorkers: this.workers.length,
      activeWorkers: this.activeWorkers.size,
      queuedTasks: this.queue.length,
      idleWorkers: this.workers.length - this.activeWorkers.size
    };
  }
}

export default WorkerPool;
