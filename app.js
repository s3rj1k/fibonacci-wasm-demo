// Main application logic for Fibonacci WASM Calculator

class WorkerRouter {
  constructor() {
    this.workers = new Map();
    this.workerReady = new Map();
    this.pendingRequests = new Map();
    this.requestCounter = 0;
  }

  registerWorker(serviceName, workerScript) {
    const worker = new Worker(workerScript);

    worker.onmessage = (event) => {
      console.log("Worker response received:", event.data);
      let response = event.data;

      if (response.type === "ready") {
        console.log(`Worker ${serviceName} is ready`);
        this.workerReady.set(serviceName, true);
        return;
      }

      if (response.type === "error") {
        console.error(`Worker ${serviceName} error:`, response);
        return;
      }

      if (typeof response === "string") {
        try {
          response = JSON.parse(response);
          console.log("Parsed JSON response:", response);
        } catch (e) {
          console.error("Failed to parse response:", e);
          return;
        }
      }

      const requestId = response.id;

      if (this.pendingRequests.has(requestId)) {
        const { resolve } = this.pendingRequests.get(requestId);
        this.pendingRequests.delete(requestId);
        console.log("Resolving request:", requestId);
        resolve(response);
      } else {
        console.warn("No pending request found for ID:", requestId);
      }
    };

    worker.onerror = (error) => {
      console.error(`Worker ${serviceName} error:`, error);
    };

    this.workers.set(serviceName, worker);
    this.workerReady.set(serviceName, false);
    console.log(`Registered worker service: ${serviceName}`);
  }

  async post(serviceName, path, body = {}) {
    console.log("WorkerRouter.post called:", serviceName, path, body);

    const worker = this.workers.get(serviceName);
    if (!worker) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    if (!this.workerReady.get(serviceName)) {
      console.log(`Waiting for worker ${serviceName} to be ready...`);
      await this.waitForWorkerReady(serviceName);
    }

    const requestId = `${Date.now()}_${++this.requestCounter}`;
    const request = {
      id: requestId,
      method: "POST",
      path: path,
      body: body,
    };

    console.log("Sending to worker:", request);

    const responsePromise = new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });

      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error("Request timeout"));
        }
      }, 30000); // 30 second timeout for large calculations
    });

    worker.postMessage(request);
    return responsePromise;
  }

  async waitForWorkerReady(serviceName, timeout = 10000) {
    const startTime = Date.now();
    while (!this.workerReady.get(serviceName)) {
      if (Date.now() - startTime > timeout) {
        throw new Error(
          `Worker ${serviceName} failed to initialize within ${timeout}ms`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

class FibonacciApp {
  constructor() {
    this.router = new WorkerRouter();
    this.init();
  }

  async init() {
    this.router.registerWorker("fibonacci", "static/worker.js");
    this.setupEventListeners();

    document.getElementById("numberInput").focus();
    console.log("Fibonacci WASM App initialized");
  }

  setupEventListeners() {
    const form = document.getElementById("fibonacciForm");
    const clearBtn = document.getElementById("clearBtn");
    const input = document.getElementById("numberInput");

    // Form submission
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleCalculation();
    });

    // Clear button
    clearBtn.addEventListener("click", () => {
      this.clearResults();
    });

    // Enter key support
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleCalculation();
      }
    });
  }

  async handleCalculation() {
    console.log("handleCalculation called");

    const input = document.getElementById("numberInput");
    const n = parseInt(input.value);

    console.log("Input value:", input.value, "Parsed n:", n);

    this.showLoading();

    console.log("Sending request to worker:", { n });
    console.log("Calling router.post with fibonacci service");

    try {
      const startTime = performance.now();
      const response = await this.router.post("fibonacci", "/fibonacci", { n });
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      console.log("Received response:", response);

      if (response.status === 200) {
        this.showSuccess(response.body.sequence, n, duration);
      } else {
        this.showError(response.body.error);
      }
    } catch (error) {
      console.error("Calculation error:", error);
      this.showError(`Calculation failed: ${error.message}`);
    }
  }

  clearResults() {
    document.getElementById("numberInput").value = "";
    document.getElementById("result").innerHTML = "";
    document.getElementById("numberInput").focus();
  }

  showLoading() {
    document.getElementById("result").innerHTML = `
            <div class="card">
                <div class="card-body text-center">
                    <div class="spinner-border text-primary me-2 loading-spinner" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span class="status-loading">Calculating Fibonacci sequence...</span>
                </div>
            </div>
        `;
  }

  showSuccess(sequence, count, duration) {
    document.getElementById("result").innerHTML = `
            <div class="card">
                <div class="card-header bg-success text-white">
                    <h6 class="card-title mb-0">
                        <i class="fas fa-check-circle me-2"></i>
                        Fibonacci Sequence (first ${count} numbers)
                        <small class="float-end">Calculated in ${duration}ms</small>
                    </h6>
                </div>
                <div class="card-body">
                    <div class="mb-3">
                        <label class="form-label fw-bold">JSON Format:</label>
                        <div class="json-display">
                            ${JSON.stringify(sequence, null, 2)}
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <small class="text-muted">
                                <i class="fas fa-info-circle me-1"></i>
                                Calculated using Go WebAssembly with arbitrary precision
                            </small>
                        </div>
                        <div class="col-md-6 text-end">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                Performance: ${duration}ms
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  showError(message) {
    document.getElementById("result").innerHTML = `
            <div class="alert alert-danger" role="alert">
                <h6 class="alert-heading">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Error
                </h6>
                <p class="mb-0">${message}</p>
            </div>
        `;
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FibonacciApp();
});
