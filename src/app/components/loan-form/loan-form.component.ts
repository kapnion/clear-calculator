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
      // Darlehensbetrag: Weiterhin größer 0
      loanAmount: ['', [Validators.required, Validators.min(1)]],

      // Sollzins: > 0 und <= 100
      interestRate: ['', [
        Validators.required,
        Validators.min(0.0000001), // Stellt sicher, dass es > 0 ist
        Validators.max(100)        // Maximal 100
      ]],

      // Anfängliche Tilgung: > 0 und <= 100
      initialRepayment: ['', [
        Validators.required,
        Validators.min(0.0000001), // Stellt sicher, dass es > 0 ist
        Validators.max(100)        // Maximal 100
      ]],

      // Zinsbindung: Integer, >= 1 und <= 100
      interestFixation: ['', [
        Validators.required,
        Validators.min(1),         // Mindestens 1
        Validators.max(100),       // Maximal 100
        Validators.pattern(/^[0-9]+$/) // Stellt sicher, dass es eine positive Ganzzahl ist
      ]]
    });
  }


  get loanAmountControl() { return this.loanForm.get('loanAmount'); }
  get interestRateControl() { return this.loanForm.get('interestRate'); }
  get initialRepaymentControl() { return this.loanForm.get('initialRepayment'); }
  get interestFixationControl() { return this.loanForm.get('interestFixation'); }

  onSubmit(): void {
    if (this.loanForm.valid) {
      this.loanDataSubmitted.emit(this.loanForm.value as LoanData);
    } else {
      console.log("Form is invalid");
      this.loanForm.markAllAsTouched(); // Markiere alle Felder als berührt, um Fehler anzuzeigen
    }
  }
}