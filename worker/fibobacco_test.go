package main

import (
	"math/big"
	"testing"
)

func TestGenerateFibonacci(t *testing.T) {
	tests := []struct {
		name     string
		input    int
		expected []*big.Int
	}{
		{
			name:     "zero input",
			input:    0,
			expected: []*big.Int{},
		},
		{
			name:     "negative input",
			input:    -1,
			expected: []*big.Int{},
		},
		{
			name:     "single element",
			input:    1,
			expected: []*big.Int{big.NewInt(0)},
		},
		{
			name:     "two elements",
			input:    2,
			expected: []*big.Int{big.NewInt(0), big.NewInt(1)},
		},
		{
			name:     "five elements",
			input:    5,
			expected: []*big.Int{big.NewInt(0), big.NewInt(1), big.NewInt(1), big.NewInt(2), big.NewInt(3)},
		},
		{
			name:     "ten elements",
			input:    10,
			expected: []*big.Int{big.NewInt(0), big.NewInt(1), big.NewInt(1), big.NewInt(2), big.NewInt(3), big.NewInt(5), big.NewInt(8), big.NewInt(13), big.NewInt(21), big.NewInt(34)},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateFibonacci(tt.input)

			if len(result) != len(tt.expected) {
				t.Errorf("GenerateFibonacci(%d) length = %d, want %d", tt.input, len(result), len(tt.expected))
				return
			}

			for i := range result {
				if result[i].Cmp(tt.expected[i]) != 0 {
					t.Errorf("GenerateFibonacci(%d)[%d] = %s, want %s", tt.input, i, result[i].String(), tt.expected[i].String())
				}
			}
		})
	}
}

func TestLargeFibonacci(t *testing.T) {
	result := GenerateFibonacci(100)
	if len(result) != 100 {
		t.Errorf("Expected 100 elements, got %d", len(result))
	}

	// Our sequence is 0-indexed: F(0)=0, F(1)=1, F(2)=1, F(3)=2, etc.
	// So result[99] is the 100th element, which is F(99) in mathematical terms
	f99 := result[99]                   // This is F(99)
	expected := "218922995834555169026" // F(99)

	if f99.String() != expected {
		t.Errorf("F(99) (100th element) = %s, want %s", f99.String(), expected)
	}
}
