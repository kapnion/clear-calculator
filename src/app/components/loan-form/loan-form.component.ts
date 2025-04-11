import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoanData } from '../../models/loan-data';
import { FORM_CONTROLS, VALIDATION_PARAMS } from './loan-form.constants';
import { greaterThanZeroValidator } from './loan-form.validators';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule
  ],
  templateUrl: './loan-form.component.html',
  styleUrls: ['./loan-form.component.scss']
})
export class LoanFormComponent implements OnInit {
  @Output() loanDataSubmitted = new EventEmitter<LoanData>();

  loanForm!: FormGroup;

  readonly validationParams = VALIDATION_PARAMS;
  readonly formControlNames = FORM_CONTROLS;

  constructor(private fb: FormBuilder) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // ngOnInit is a good place for logic after component initialization
    // If form initialization was complex, it could go here.
  }

  private initializeForm(): void {
    this.loanForm = this.fb.group({
      [FORM_CONTROLS.LOAN_AMOUNT]: ['', [
        Validators.required,
        Validators.min(VALIDATION_PARAMS.MIN_LOAN_AMOUNT)
      ]],
      [FORM_CONTROLS.INTEREST_RATE]: ['', [
        Validators.required,
        Validators.min(VALIDATION_PARAMS.MIN_INTEREST_RATE),
        Validators.max(VALIDATION_PARAMS.MAX_PERCENTAGE)
      ]],
      [FORM_CONTROLS.INITIAL_REPAYMENT]: ['', [
        Validators.required,
        greaterThanZeroValidator(),
        Validators.max(VALIDATION_PARAMS.MAX_PERCENTAGE)
      ]],
      [FORM_CONTROLS.INTEREST_FIXATION]: ['', [
        Validators.required,
        Validators.min(VALIDATION_PARAMS.MIN_FIXATION_YEARS),
        Validators.max(VALIDATION_PARAMS.MAX_FIXATION_YEARS),
        Validators.pattern(VALIDATION_PARAMS.INTEGER_PATTERN)
      ]]
    });
  }

  get loanAmountControl(): AbstractControl | null { return this.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT); }
  get interestRateControl(): AbstractControl | null { return this.loanForm.get(FORM_CONTROLS.INTEREST_RATE); }
  get initialRepaymentControl(): AbstractControl | null { return this.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT); }
  get interestFixationControl(): AbstractControl | null { return this.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION); }

  onSubmit(): void {
    if (this.loanForm.valid) {
      const formData = this.loanForm.value;
      const loanData: LoanData = {
        loanAmount: Number(formData[FORM_CONTROLS.LOAN_AMOUNT]),
        interestRate: Number(formData[FORM_CONTROLS.INTEREST_RATE]),
        initialRepayment: Number(formData[FORM_CONTROLS.INITIAL_REPAYMENT]),
        interestFixation: Number(formData[FORM_CONTROLS.INTEREST_FIXATION])
      };
      console.log('Form Submitted:', loanData);
      this.loanDataSubmitted.emit(loanData);
    } else {
      console.log("Form is invalid. Marking fields as touched.");
      this.loanForm.markAllAsTouched();
    }
  }
}