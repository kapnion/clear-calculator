import { Injectable } from '@angular/core';
import { AmortizationEntry } from '../models/amortization-entry';
import { LoanData } from '../models/loan-data';
import { SummaryData } from '../models/summary-data';

// --- Custom Error Types ---
export class InvalidLoanDataError extends Error {
  constructor(message: string) { super(message); this.name = 'InvalidLoanDataError'; }
}
export class InsufficientRateError extends Error {
  constructor(message: string) { super(message); this.name = 'InsufficientRateError'; }
}

// --- Utility Functions ---
function roundToTwoDecimals(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    console.warn(`Rounding encountered invalid value: ${value}. Returning 0.`);
    return 0;
  }
  return Number(Math.round(Number(value + 'e+2')) + 'e-2');
}
function getMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function getNextMonthEndDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 2, 0);
}

/**
 * @Injectable
 * Service for calculating loan amortization schedules and summaries.
 * Uses negative balance convention as required.
 */
@Injectable({
  providedIn: 'root'
})
export class AmortizationService {

  private readonly MONTHS_IN_YEAR = 12;
  private readonly PERCENT_FACTOR = 100;
  private readonly ZERO_THRESHOLD = 0.005; // Half a cent tolerance

  calculateAmortizationPlan(loanData: LoanData): AmortizationEntry[] {
    if (!this.isValidLoanData(loanData)) {
      throw new InvalidLoanDataError("Invalid loan data provided. All values must be positive numbers.");
    }

    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;

    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;
    const numberOfPayments = interestFixation * this.MONTHS_IN_YEAR;
    const monthlyPayment = this._calculateMonthlyPayment(loanAmount, interestRate, initialRepayment);
    const firstMonthInterest = roundToTwoDecimals(loanAmount * monthlyInterestRate);

    if (monthlyPayment <= firstMonthInterest + this.ZERO_THRESHOLD) {
      let errorMsg = `Calculated monthly payment (${monthlyPayment.toFixed(2)} €) is insufficient to cover first month's interest (${firstMonthInterest.toFixed(2)} €) and reduce principal.`;
      if (Math.abs(monthlyPayment - firstMonthInterest) < this.ZERO_THRESHOLD) {
        errorMsg = `Calculated monthly payment (${monthlyPayment.toFixed(2)} €) exactly covers first month's interest (${firstMonthInterest.toFixed(2)} €). Loan principal will not be reduced.`;
      }
      errorMsg += " Please decrease interest rate or increase initial repayment percentage.";
      throw new InsufficientRateError(errorMsg);
    }

    const amortizationEntries: AmortizationEntry[] = [];
    let currentDate = getMonthEndDate(new Date());

    amortizationEntries.push(this._createDisbursementEntry(loanAmount, currentDate));
    currentDate = getNextMonthEndDate(currentDate);

    for (let i = 0; i < numberOfPayments; i++) {
      const previousBalance = amortizationEntries[amortizationEntries.length - 1].remainingDebt;

      if (Math.abs(previousBalance) < this.ZERO_THRESHOLD) {
        amortizationEntries.push(this._createZeroEntry(currentDate));
      } else {
        const nextEntry = this._calculateNextPaymentEntry(
          previousBalance,
          monthlyPayment,
          monthlyInterestRate,
          currentDate
        );
        amortizationEntries.push(nextEntry);
      }
      currentDate = getNextMonthEndDate(currentDate);
    }

    return amortizationEntries;
  }

  calculateSummaryData(amortizationPlan: AmortizationEntry[]): SummaryData {
    if (!amortizationPlan || amortizationPlan.length === 0) {
      return { remainingDebt: 0, totalInterestPaid: 0, totalRepaymentPaid: 0 };
    }

    const paymentEntries = amortizationPlan.slice(1);
    const totalInterestPaid = paymentEntries.reduce((sum, entry) => sum + entry.interest, 0);
    const totalRepaymentPaid = paymentEntries.reduce((sum, entry) => sum + entry.repayment, 0);

    const lastEntry = amortizationPlan[amortizationPlan.length - 1];
    const remainingDebt = lastEntry ? roundToTwoDecimals(lastEntry.remainingDebt) : 0;

    return {
      remainingDebt: remainingDebt, // Should be negative or zero
      totalInterestPaid: roundToTwoDecimals(totalInterestPaid),
      totalRepaymentPaid: roundToTwoDecimals(totalRepaymentPaid)
    };
  }

  isValidLoanData(loanData: LoanData | null | undefined): loanData is LoanData {
    if (!loanData) return false;
    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;
    return (
      typeof loanAmount === 'number' && loanAmount > 0 &&
      typeof interestRate === 'number' && interestRate >= 0 && // Allow 0%
      typeof initialRepayment === 'number' && initialRepayment > 0 &&
      typeof interestFixation === 'number' && interestFixation > 0
    );
  }

  // --- Private Helper Methods ---

  private _calculateMonthlyPayment(loanAmount: number, interestRate: number, initialRepayment: number): number {
    const annualPayment = loanAmount * (interestRate / this.PERCENT_FACTOR + initialRepayment / this.PERCENT_FACTOR);
    return roundToTwoDecimals(annualPayment / this.MONTHS_IN_YEAR);
  }

  private _createDisbursementEntry(loanAmount: number, date: Date): AmortizationEntry {
    const roundedAmount = roundToTwoDecimals(loanAmount);
    return {
      date: date,
      remainingDebt: -roundedAmount,
      interest: 0.00,
      repayment: -roundedAmount, // Principal change for this entry
      payment: -roundedAmount   // Cash flow for this entry
    };
  }

   /**
   * Calculates the next amortization entry for a regular payment month.
   * Expects previousBalance to be negative or zero.
   * Returns positive interest, positive repayment (principal portion), positive payment.
   * Returns negative or zero remainingDebt.
   */
  private _calculateNextPaymentEntry(
    previousBalance: number, // Negative or zero
    monthlyPayment: number, // Positive fixed payment
    monthlyInterestRate: number, // Positive rate
    currentDate: Date
  ): AmortizationEntry {

    // Ensure previousBalance is not positive (should not happen in normal flow)
    if (previousBalance > 0) {
        console.error("Invalid state: previousBalance should be negative or zero.", previousBalance);
        // Handle error appropriately, maybe return a zero entry or throw
        return this._createZeroEntry(currentDate);
    }

    // Calculate positive interest amount based on the absolute value of the negative balance
    // Avoid calculation if balance is already effectively zero
    const interest = (Math.abs(previousBalance) < this.ZERO_THRESHOLD)
                     ? 0.00
                     : roundToTwoDecimals(-previousBalance * monthlyInterestRate);

    // Determine the principal payment portion for a standard payment
    let principalPayment = roundToTwoDecimals(monthlyPayment - interest);

    // Assume the actual payment is the standard monthly payment initially
    let actualPayment = monthlyPayment;

    // Get the absolute value of the debt before this payment
    const absoluteBalanceBeforePayment = -previousBalance; // Will be positive

    // --- Final Payment Adjustment ---
    // Check if the calculated principal is sufficient to clear the remaining debt,
    // or if the remaining debt itself is less than a standard principal payment.
    // Use ZERO_THRESHOLD for comparisons.
    // Ensure absoluteBalanceBeforePayment is greater than zero before adjusting
    if (absoluteBalanceBeforePayment > 0 && principalPayment >= absoluteBalanceBeforePayment - this.ZERO_THRESHOLD) {
        // This payment will clear the debt. Adjust principal and actual payment.
        principalPayment = absoluteBalanceBeforePayment; // Pay exactly what's left (positive value)
        actualPayment = roundToTwoDecimals(interest + principalPayment); // Final payment might be lower
    }

    // Defensive check: Ensure principal payment isn't negative
    if (principalPayment < 0) {
        console.warn("Calculated negative principal payment mid-term. Rate might be insufficient.", { interest, monthlyPayment });
        principalPayment = 0;
        actualPayment = roundToTwoDecimals(interest + principalPayment);
    }

    // Calculate the new balance: Add the positive principal payment to the negative previous balance.
    let newBalance = roundToTwoDecimals(previousBalance + principalPayment);

    // --- Zero Balance Check ---
    // Ensure the balance is exactly zero if it's very close after calculation.
    if (Math.abs(newBalance) < this.ZERO_THRESHOLD) {
        newBalance = 0;
    }

    // Ensure returned values are rounded consistently
    return {
      date: new Date(currentDate),
      remainingDebt: newBalance, // Negative or zero
      interest: roundToTwoDecimals(interest), // Positive
      repayment: roundToTwoDecimals(principalPayment), // Positive principal portion
      payment: roundToTwoDecimals(actualPayment) // Positive payment amount
    };
  }


  private _createZeroEntry(currentDate: Date): AmortizationEntry {
    return {
      date: new Date(currentDate),
      remainingDebt: 0,
      interest: 0,
      repayment: 0,
      payment: 0
    };
  }
}