package main

func GenerateFibonacci(n int) []int {
	if n <= 0 {
		return []int{}
	}

	if n == 1 {
		return []int{0}
	}

	sequence := make([]int, n)
	sequence[0], sequence[1] = 0, 1

	for i := 2; i < n; i++ {
		sequence[i] = sequence[i-1] + sequence[i-2]
	}

	return sequence
}
