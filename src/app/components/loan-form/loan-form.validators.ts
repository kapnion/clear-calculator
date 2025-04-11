import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function greaterThanZeroValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control === null || control.value === null || control.value === '') {
      return null;
    }
    const value = control.value;
    if (isNaN(value) || Number(value) <= 0) {
      return { 'greaterThanZero': true };
    }
    return null;
  };
}
