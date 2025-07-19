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
      const response = event.data;

      if (response.type === "ready") {
        console.log(`Worker ${serviceName} is ready`);
        this.workerReady.set(serviceName, true);
        return;
      }

      if (response.type === "error") {
        console.error(`Worker ${serviceName} error:`, response);
        throw new Error(response.details || response.error);
      }

      const parsedResponse =
        typeof response === "string" ? JSON.parse(response) : response;
      console.log("Parsed response:", parsedResponse);

      const { resolve } = this.pendingRequests.get(parsedResponse.id) || {};

      if (resolve) {
        this.pendingRequests.delete(parsedResponse.id);
        console.log("Resolving request:", parsedResponse.id);
        resolve(parsedResponse);
      } else {
        console.warn("No pending request found for ID:", parsedResponse.id);
      }
    };

    worker.onerror = (error) => {
      console.error(`Worker ${serviceName} error:`, error);
      throw new Error(`Worker ${serviceName} error: ${error.message}`);
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
      }, 300000); // 5 minutes timeout for large calculations
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

class UIRenderer {
  constructor() {
    this.resultContainer = document.getElementById("result");
  }

  renderTemplate(templateId, data = {}) {
    const template = document.getElementById(templateId);
    let html = template.innerHTML;

    // Simple template replacement
    Object.entries(data).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{${key}}`, "g"), value);
    });

    this.resultContainer.innerHTML = html;
  }

  showLoading() {
    this.renderTemplate("loading-template");
  }

  showSuccess(sequence, count, duration, arbitraryPrecision) {
    const precisionMode = arbitraryPrecision
      ? "Arbitrary Precision (strings)"
      : "Standard JavaScript Numbers";

    this.renderTemplate("success-template", {
      count,
      duration,
      precision_mode: precisionMode,
      sequence: JSON.stringify(sequence, null, 2),
    });
  }

  showError(message) {
    this.renderTemplate("error-template", { message });
  }

  clear() {
    this.resultContainer.innerHTML = "";
  }
}

class ErrorHandler {
  static handle(error, ui) {
    console.error("Application error:", error);

    let message = "An unexpected error occurred";

    if (error.message.includes("timeout")) {
      message = "Calculation took too long - please try a smaller number";
    } else if (error.message.includes("Worker")) {
      message = "Failed to initialize calculator - please refresh the page";
    } else if (error.message.includes("fetch")) {
      message = "Failed to load calculator - check your internet connection";
    } else if (error.message) {
      message = error.message;
    }

    ui.showError(message);
  }
}

class FibonacciApp {
  constructor() {
    this.router = new WorkerRouter();
    this.ui = new UIRenderer();
    this.init();
  }

  async init() {
    this.router.registerWorker("fibonacci", "static/worker.js");
    this.setupEventListeners();
    document.getElementById("numberInput").focus();
  }

  setupEventListeners() {
    const form = document.getElementById("fibonacciForm");
    const clearBtn = document.getElementById("clearBtn");
    const input = document.getElementById("numberInput");
    const arbitraryToggle = document.getElementById("arbitraryPrecisionToggle");
    const inputHint = document.getElementById("inputHint");

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      this.handleCalculation();
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      this.ui.clear();
      input.focus();
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.handleCalculation();
      }
    });

    arbitraryToggle.addEventListener("change", () => {
      this.updateInputLimits();
    });

    this.updateInputLimits();
  }

  updateInputLimits() {
    const input = document.getElementById("numberInput");
    const arbitraryToggle = document.getElementById("arbitraryPrecisionToggle");
    const inputHint = document.getElementById("inputHint");

    if (arbitraryToggle.checked) {
      // Arbitrary precision mode - remove max limit
      input.removeAttribute("max");
      inputHint.textContent = "Unlimited (arbitrary precision enabled)";
      inputHint.className = "form-text text-success";
    } else {
      // Standard mode - limit to 98
      input.setAttribute("max", "98");
      inputHint.textContent = "Max: 98 (arbitrary precision disabled)";
      inputHint.className = "form-text text-muted";

      // If current value exceeds 98, clear it
      if (input.value && parseInt(input.value) > 98) {
        input.value = "";
        this.ui.showError(
          "Input reduced to standard mode limit. Please enter a number ≤ 98 or enable arbitrary precision.",
        );
      }
    }
  }

  async handleCalculation() {
    const input = document.getElementById("numberInput");
    const arbitraryToggle = document.getElementById("arbitraryPrecisionToggle");
    const n = parseInt(input.value);

    if (isNaN(n) || n < 0) {
      this.ui.showError("Please enter a valid non-negative number");
      return;
    }

    if (!arbitraryToggle.checked && n > 98) {
      this.ui.showError(
        "In standard mode, maximum value is 98. Enable arbitrary precision for larger numbers.",
      );
      return;
    }

    try {
      this.ui.showLoading();

      const startTime = performance.now();
      const response = await this.router.post("fibonacci", "/fibonacci", {
        n: n,
        arbitrary_precision: arbitraryToggle.checked,
      });
      const duration = Math.round(performance.now() - startTime);

      if (response.status === 200) {
        this.ui.showSuccess(
          response.body.sequence,
          n,
          duration,
          arbitraryToggle.checked,
        );
      } else {
        this.ui.showError(response.body.error || "Calculation failed");
      }
    } catch (error) {
      console.error("Calculation error:", error);
      ErrorHandler.handle(error, this.ui);
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FibonacciApp();
});
