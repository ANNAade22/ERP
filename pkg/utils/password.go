package utils

import (
	"errors"
	"unicode"
)

var ErrWeakPassword = errors.New("password must be at least 8 characters and contain uppercase, lowercase, and a number")

// ValidatePassword enforces minimum length 8 and at least one uppercase, one lowercase, and one digit.
func ValidatePassword(p string) error {
	if len(p) < 8 {
		return ErrWeakPassword
	}
	var upper, lower, digit bool
	for _, r := range p {
		switch {
		case unicode.IsUpper(r):
			upper = true
		case unicode.IsLower(r):
			lower = true
		case unicode.IsNumber(r):
			digit = true
		}
		if upper && lower && digit {
			return nil
		}
	}
	return ErrWeakPassword
}
