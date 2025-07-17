// WebWorker wrapper for Go WASM Fibonacci service
importScripts("wasm_exec.js");

let ready = false;
let wasmInstance = null;

async function initWASM() {
  try {
    console.log("Initializing Fibonacci WASM worker...");

    const go = new Go();

    console.log("Fetching fibonacci.wasm...");
    const response = await fetch("fibonacci.wasm");
    console.log("Fetch response status:", response.status);
    console.log(
      "Fetch response headers:",
      response.headers.get("content-type"),
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch WASM: ${response.status} ${response.statusText}`,
      );
    }

    const result = await WebAssembly.instantiateStreaming(
      fetch("fibonacci.wasm"),
      go.importObject,
    );

    wasmInstance = result.instance;
    console.log("WASM instance created successfully");

    console.log("Running Go program...");
    go.run(wasmInstance);

    await new Promise((resolve) => setTimeout(resolve, 100));
    console.log(
      "Checking if handleGoMessage is available:",
      typeof self.handleGoMessage,
    );
    ready = true;
    console.log("Fibonacci WASM worker initialized successfully");

    self.postMessage({
      type: "ready",
      message: "Fibonacci WASM worker is ready",
    });
  } catch (error) {
    console.error("Failed to initialize WASM worker:", error);
    self.postMessage({
      type: "error",
      error: "Failed to initialize WASM service",
      details: error.message,
    });
  }
}

// Handle incoming messages
self.onmessage = function (event) {
  console.log("Worker received message:", event.data);

  if (!ready) {
    console.log("Worker not ready, sending error response");
    self.postMessage({
      type: "error",
      error: "Service not ready yet",
      id: event.data.id,
    });
    return;
  }

  const messageData = JSON.stringify(event.data);
  console.log("Sending to Go:", messageData);

  if (self.handleGoMessage) {
    console.log("Calling handleGoMessage...");
    self.handleGoMessage(messageData);
  } else {
    console.error("handleGoMessage function not available");
    self.postMessage({
      id: event.data.id,
      status: 500,
      body: {
        error: "WASM function not available",
      },
    });
  }
};

// Handle worker errors
self.onerror = function (error) {
  console.error("Worker error:", error);
  self.postMessage({
    type: "error",
    error: "Worker execution error",
    details: error.message,
  });
};

// Initialize when worker starts
initWASM();
