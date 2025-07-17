# Variables
WORKER_DIR := worker
STATIC_DIR := static
WASM_FILE := $(STATIC_DIR)/fibonacci.wasm
WASM_EXEC := $(STATIC_DIR)/wasm_exec.js
GO_ROOT := $(shell go env GOROOT)

# Default target
.PHONY: all
all: build

# Build WASM and copy runtime
.PHONY: build
build: test $(WASM_FILE) $(WASM_EXEC)
	@echo "✅ Build complete!"
	@echo ""
	@echo "📝 Files ready for GitHub Pages:"
	@echo "   - index.html"
	@echo "   - style.css"
	@echo "   - app.js"
	@echo "   - $(WASM_FILE)"
	@echo "   - $(WASM_EXEC)"
	@echo "   - $(STATIC_DIR)/worker.js"

# Build WASM file
$(WASM_FILE): $(WORKER_DIR)/main.go $(WORKER_DIR)/go.mod
	@echo "🔧 Building WASM worker..."
	@mkdir -p $(STATIC_DIR)
	cd $(WORKER_DIR) && GOOS=js GOARCH=wasm go build -o ../$(WASM_FILE)

# Copy WASM runtime
$(WASM_EXEC): $(WASM_FILE)
	@echo "📁 Copying WASM runtime..."
	@cp "$(GO_ROOT)/lib/wasm/wasm_exec.js" $(WASM_EXEC)

# Clean build artifacts
.PHONY: clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -f $(WASM_FILE) $(WASM_EXEC)
	@echo "✅ Clean complete!"

# Test Go code
.PHONY: test
test:
	@echo "🧪 Running Go tests..."
	@cd $(WORKER_DIR) && go test -v ./...
	@echo "✅ Tests complete!"

# Serve locally for development
.PHONY: serve
serve: build
	@echo "🌐 Starting development server on http://localhost:8080"
	@echo "Press Ctrl+C to stop"
	@cd . && python3 -m http.server 8080 || python -m SimpleHTTPServer 8080
