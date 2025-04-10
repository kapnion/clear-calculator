import { Component, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';
import { LoanData } from '../../models/loan-data';

@Component({
  selector: 'app-loan-form',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule], // Benötigte Module importieren
  templateUrl: './loan-form.component.html',
  styleUrls: ['./loan-form.component.scss']
})
export class LoanFormComponent {
  @Output() loanDataSubmitted = new EventEmitter<LoanData>();

  loanForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.loanForm = this.fb.group({
      loanAmount: ['', [Validators.required, Validators.min(1)]],
      interestRate: ['', [Validators.required, Validators.min(0.01)]],
      initialRepayment: ['', [Validators.required, Validators.min(1)]],
      interestFixation: ['', [Validators.required, Validators.min(1)]]
    });
  }

  onSubmit(): void {
    if (this.loanForm.valid) {
      this.loanDataSubmitted.emit(this.loanForm.value as LoanData);
    } else {
      // Formular ist ungültig.  Hier könntest du Validierungsfehler anzeigen.
      console.log("Form is invalid");
      this.loanForm.markAllAsTouched();
    }
  }
}