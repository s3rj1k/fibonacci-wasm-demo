//go:build js && wasm
// +build js,wasm

package main

import (
	"syscall/js"
)

func main() {
	// Export the function to the WebWorker self context
	js.Global().Get("self").Set("handleGoMessage", js.FuncOf(HandleMessage))

	// Keep the program running
	select {}
}
