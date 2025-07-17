//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"syscall/js"
	"time"
)

type Request struct {
	Method string         `json:"method"`
	Path   string         `json:"path"`
	Body   map[string]any `json:"body"`
	ID     string         `json:"id"`
}

type Response struct {
	Status int            `json:"status"`
	Body   map[string]any `json:"body"`
	ID     string         `json:"id"`
}

func HandleMessage(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		return nil
	}

	var req Request

	b := []byte(args[0].String())

	if err := json.Unmarshal(b, &req); err != nil {
		fmt.Printf("Error unmarshaling request: %v\n", err)

		responseJSON, _ := json.Marshal(Response{
			Status: http.StatusBadRequest,
			Body: map[string]any{
				"error": fmt.Sprintf("Invalid request format: %v", err),
			},
			ID: req.ID,
		})

		js.Global().Get("self").Call("postMessage", string(responseJSON))

		return nil
	}

	responseJSON, _ := json.Marshal(
		HandleRequest(req),
	)

	js.Global().Get("self").Call("postMessage", string(responseJSON))

	return nil
}

func HandleRequest(req Request) Response {
	if req.Method != http.MethodPost || req.Path != "/fibonacci" {
		return Response{
			Status: http.StatusNotFound,
			Body: map[string]any{
				"error": "Endpoint not found",
			},
			ID: req.ID,
		}
	}

	val, ok := req.Body["n"].(float64)
	n := int(val)

	if !ok {
		return Response{
			Status: http.StatusBadRequest,
			Body: map[string]any{
				"error": "Invalid input: 'n' must be a number",
			},
			ID: req.ID,
		}
	}

	if n < 0 {
		return Response{
			Status: http.StatusBadRequest,
			Body: map[string]any{
				"error": "Input must be non-negative",
			},
			ID: req.ID,
		}
	}

	startTime := time.Now()

	return Response{
		Status: http.StatusOK,
		Body: map[string]any{
			"sequence":    GenerateFibonacci(n),
			"count":       n,
			"duration_ms": time.Since(startTime).Milliseconds(),
		},
		ID: req.ID,
	}
}
