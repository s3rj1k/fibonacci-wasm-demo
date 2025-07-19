// WebWorker wrapper for Go WASM Fibonacci service
importScripts("wasm_exec.js");

let ready = false;

async function initWASM() {
  try {
    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(
      fetch("fibonacci.wasm"),
      go.importObject,
    );

    go.run(result.instance);

    // Wait briefly for Go to initialize
    await new Promise((resolve) => setTimeout(resolve, 100));

    ready = true;

    self.postMessage({
      type: "ready",
      message: "Fibonacci WASM worker is ready",
    });
  } catch (error) {
    console.error("WASM initialization failed:", error);
    self.postMessage({
      type: "error",
      error: "Failed to initialize WASM service",
      details: error.message,
    });
  }
}

// Handle incoming messages
self.onmessage = function (event) {
  if (!ready) {
    self.postMessage({
      type: "error",
      error: "Service not ready yet",
      id: event.data.id,
    });
    return;
  }

  if (self.handleGoMessage) {
    self.handleGoMessage(event.data);
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
