//go:build js && wasm
// +build js,wasm

package main

import (
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"syscall/js"
	"time"
)

// Helper function to send error responses
func sendErrorResponse(errorMsg string, id string, status int) {
	responseJSON, _ := json.Marshal(map[string]any{
		"status": status,
		"body": map[string]any{
			"error": errorMsg,
		},
		"id": id,
	})

	js.Global().Get("self").Call("postMessage", string(responseJSON))
}

// Helper function to send success responses
func sendSuccessResponse(body map[string]any, id string) {
	responseJSON, _ := json.Marshal(map[string]any{
		"status": http.StatusOK,
		"body":   body,
		"id":     id,
	})

	js.Global().Get("self").Call("postMessage", string(responseJSON))
}

func HandleMessage(this js.Value, args []js.Value) any {
	if len(args) == 0 {
		sendErrorResponse("No message provided", "unknown", http.StatusBadRequest)
		return nil
	}

	jsObj := args[0]

	if jsObj.Type() != js.TypeObject {
		sendErrorResponse("Invalid message format: expected object", "unknown", http.StatusBadRequest)
		return nil
	}

	idJS, requestID := jsObj.Get("id"), "unknown"
	if !idJS.IsUndefined() && idJS.Type() == js.TypeString {
		requestID = idJS.String()
	}

	methodJS, pathJS := jsObj.Get("method"), jsObj.Get("path")
	if methodJS.IsUndefined() || pathJS.IsUndefined() || idJS.IsUndefined() {
		sendErrorResponse("Missing required fields: method, path, or id", requestID, http.StatusBadRequest)
		return nil
	}

	if methodJS.Type() != js.TypeString || pathJS.Type() != js.TypeString || idJS.Type() != js.TypeString {
		sendErrorResponse("Invalid field types: method, path, and id must be strings", requestID, http.StatusBadRequest)
		return nil
	}

	method, path := methodJS.String(), pathJS.String()
	if method != http.MethodPost || path != "/fibonacci" {
		sendErrorResponse("Endpoint not found", requestID, http.StatusNotFound)
		return nil
	}

	bodyJS := jsObj.Get("body")
	if bodyJS.IsUndefined() {
		sendErrorResponse("Missing required field: body", requestID, http.StatusBadRequest)
		return nil
	}

	if bodyJS.Type() != js.TypeObject {
		sendErrorResponse("Invalid body format: expected object", requestID, http.StatusBadRequest)
		return nil
	}

	nValue := bodyJS.Get("n")
	if nValue.IsUndefined() {
		sendErrorResponse("Missing required field 'n' in body", requestID, http.StatusBadRequest)
		return nil
	}

	if nValue.Type() != js.TypeNumber {
		sendErrorResponse("Invalid 'n' field: must be a number", requestID, http.StatusBadRequest)
		return nil
	}

	nFloat := nValue.Float()
	if math.IsNaN(nFloat) || math.IsInf(nFloat, 0) {
		sendErrorResponse("Invalid 'n' field: cannot be NaN or infinity", requestID, http.StatusBadRequest)
		return nil
	}

	if nFloat != math.Trunc(nFloat) {
		sendErrorResponse("Invalid 'n' field: must be an integer", requestID, http.StatusBadRequest)
		return nil
	}

	n := int(nFloat)
	if n < 0 {
		sendErrorResponse("Input must be non-negative", requestID, http.StatusBadRequest)
		return nil
	}

	arbitraryPrecisionJS, arbitraryPrecision := bodyJS.Get("arbitrary_precision"), false
	if !arbitraryPrecisionJS.IsUndefined() && arbitraryPrecisionJS.Type() == js.TypeBoolean {
		arbitraryPrecision = arbitraryPrecisionJS.Bool()
	}

	if !arbitraryPrecision && n > 98 {
		sendErrorResponse("Input exceeds JavaScript safe limit (98) for standard precision mode", requestID, http.StatusBadRequest)
		return nil
	}

	startTime := time.Now()
	fibSequence := GenerateFibonacci(n)

	var responseBody map[string]any

	if arbitraryPrecision {
		// Return as strings for arbitrary precision
		stringSequence := make([]string, len(fibSequence))
		for i, bigInt := range fibSequence {
			stringSequence[i] = bigInt.String()
		}

		responseBody = map[string]any{
			"sequence":            stringSequence,
			"count":               n,
			"duration_ms":         time.Since(startTime).Milliseconds(),
			"arbitrary_precision": true,
		}
	} else {
		// Return as numbers for standard JavaScript precision
		numberSequence := make([]float64, len(fibSequence))
		for i, bigInt := range fibSequence {
			// Convert to float64 for JavaScript compatibility
			if floatVal, err := strconv.ParseFloat(bigInt.String(), 64); err == nil {
				numberSequence[i] = floatVal
			} else {
				// This shouldn't happen with n <= 98, but just in case
				sendErrorResponse("Number too large for standard precision mode", requestID, http.StatusBadRequest)
				return nil
			}
		}

		responseBody = map[string]any{
			"sequence":            numberSequence,
			"count":               n,
			"duration_ms":         time.Since(startTime).Milliseconds(),
			"arbitrary_precision": false,
		}
	}

	sendSuccessResponse(responseBody, requestID)
	return nil
}
