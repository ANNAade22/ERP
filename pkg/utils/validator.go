package utils

import (
	"fmt"

	"github.com/go-playground/validator/v10"
)

// FormatValidationError formats the validation errors into a readable string array
func FormatValidationError(err error) []string {
	var errors []string
	if errs, ok := err.(validator.ValidationErrors); ok {
		for _, e := range errs {
			errors = append(errors, fmt.Sprintf("Field '%s' failed on the '%s' tag", e.Field(), e.Tag()))
		}
	} else {
		errors = append(errors, err.Error())
	}
	return errors
}
