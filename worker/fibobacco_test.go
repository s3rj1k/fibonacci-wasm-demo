package main

import (
	"reflect"
	"testing"
)

func TestGenerateFibonacci(t *testing.T) {
	tests := []struct {
		name     string
		input    int
		expected []int
	}{
		{
			name:     "zero input",
			input:    0,
			expected: []int{},
		},
		{
			name:     "negative input",
			input:    -1,
			expected: []int{},
		},
		{
			name:     "single element",
			input:    1,
			expected: []int{0},
		},
		{
			name:     "two elements",
			input:    2,
			expected: []int{0, 1},
		},
		{
			name:     "five elements",
			input:    5,
			expected: []int{0, 1, 1, 2, 3},
		},
		{
			name:     "ten elements",
			input:    10,
			expected: []int{0, 1, 1, 2, 3, 5, 8, 13, 21, 34},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := GenerateFibonacci(tt.input)
			if !reflect.DeepEqual(result, tt.expected) {
				t.Errorf("GenerateFibonacci(%d) = %v, want %v", tt.input, result, tt.expected)
			}
		})
	}
}
