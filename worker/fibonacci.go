package main

import (
	"math/big"
)

func GenerateFibonacci(n int) []*big.Int {
	if n <= 0 {
		return []*big.Int{}
	}

	if n == 1 {
		return []*big.Int{big.NewInt(0)}
	}

	sequence := make([]*big.Int, n)
	sequence[0] = big.NewInt(0)
	sequence[1] = big.NewInt(1)

	for i := 2; i < n; i++ {
		sequence[i] = big.NewInt(0)
		sequence[i].Add(sequence[i-1], sequence[i-2])
	}

	return sequence
}
