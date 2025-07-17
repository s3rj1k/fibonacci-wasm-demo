//go:build js && wasm
// +build js,wasm

package main

import (
	"fmt"
	"syscall/js"
)

func main() {
	fmt.Println("Fibonacci WASM worker starting...")

	// Export the function to the WebWorker self context
	js.Global().Get("self").Set("handleGoMessage", js.FuncOf(HandleMessage))

	fmt.Println("Fibonacci WASM worker ready")

	// Keep the program running
	select {}
}
