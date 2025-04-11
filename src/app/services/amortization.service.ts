import { Injectable } from '@angular/core';
import { AmortizationEntry } from '../models/amortization-entry';
import { LoanData } from '../models/loan-data';
import { SummaryData } from '../models/summary-data';



/**
 * @Injectable
 * Service zur Berechnung von Tilgungsplänen und deren Zusammenfassungen.
 * Stellt Methoden zur Validierung der Eingabedaten, zur Erstellung des Plans
 * und zur Berechnung der Gesamtsummen bereit.
 */
@Injectable({
  providedIn: 'root'
})
export class AmortizationService {

  private readonly MONTHS_IN_YEAR = 12;
  private readonly PERCENT_FACTOR = 100;

  /**
   * Berechnet den detaillierten monatlichen Tilgungsplan.
   * Stellt sicher, dass die Rate mindestens die anfänglichen Zinsen deckt.
   */
  calculateAmortizationPlan(loanData: LoanData): AmortizationEntry[] {
    if (!this.isValidLoanData(loanData)) {
      console.error("Invalid loan data provided to calculateAmortizationPlan.");
      return [];
    }

    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;
    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;
    const numberOfPayments = interestFixation * this.MONTHS_IN_YEAR;

    // Konstante monatliche Rate berechnen (stellt sicher, dass Zinsen gedeckt sind)
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, initialRepayment);

    // Frühzeitige Prüfung, ob die Rate überhaupt Sinn macht (sollte durch calculateMonthlyPayment abgedeckt sein, aber doppelt hält besser)
    const firstMonthInterestCheck = this.round(loanAmount * monthlyInterestRate);
    if (monthlyPayment < firstMonthInterestCheck) {
         // Dieser Fall sollte durch die Anpassung in calculateMonthlyPayment nicht mehr eintreten
         console.warn(`WARNUNG: Monatliche Rate (${monthlyPayment}) deckt nicht die ersten Zinsen (${firstMonthInterestCheck}). Tilgungsplan möglicherweise nicht sinnvoll.`);
         // Man könnte hier auch abbrechen: return [];
    }


    const amortizationEntries: AmortizationEntry[] = [];
    let currentDate = this.getActualMonthEndDate(new Date());
    let remainingDebt = -loanAmount;

    amortizationEntries.push(this.createDisbursementEntry(loanAmount, currentDate));
    currentDate = this.getNextMonthEndDate(currentDate);

    for (let i = 0; i < numberOfPayments; i++) {
      const previousEntry = amortizationEntries[amortizationEntries.length - 1];

      // Wenn die Schuld bereits getilgt ist, füge Null-Einträge hinzu
      // Wichtig: Prüfe auf < 0.005 wegen potenzieller Rundungsdifferenzen statt === 0
      if (Math.abs(previousEntry.remainingDebt) < 0.005) {
        amortizationEntries.push(this.createZeroEntry(currentDate));
      } else {
        const nextEntry = this.calculateNextEntry(
          previousEntry.remainingDebt,
          monthlyPayment,
          monthlyInterestRate,
          currentDate
        );
        amortizationEntries.push(nextEntry);
        remainingDebt = nextEntry.remainingDebt; // Update für Konsistenz (obwohl nicht mehr direkt im Loop gebraucht)
      }
      currentDate = this.getNextMonthEndDate(currentDate);
    }
    return amortizationEntries;
  }

  /**
   * Berechnet die Zusammenfassungsdaten aus einem Tilgungsplan.
   */
  calculateSummaryData(amortizationPlan: AmortizationEntry[]): SummaryData {
    let totalInterestPaid = 0;
    let totalRepaymentPaid = 0;

    if (!amortizationPlan || amortizationPlan.length === 0) {
      return { remainingDebt: 0, totalInterestPaid: 0, totalRepaymentPaid: 0 };
    }

    for (let i = 1; i < amortizationPlan.length; i++) {
      totalInterestPaid += amortizationPlan[i].interest;
      totalRepaymentPaid += amortizationPlan[i].repayment;
    }

    const lastEntry = amortizationPlan[amortizationPlan.length - 1];
    const remainingDebt = lastEntry ? lastEntry.remainingDebt : 0;

    return {
      remainingDebt: remainingDebt,
      totalInterestPaid: this.round(totalInterestPaid),
      totalRepaymentPaid: this.round(totalRepaymentPaid)
    };
  }

  /**
   * Validiert die Eingabedaten für die Darlehensberechnung.
   */
  isValidLoanData(loanData: LoanData | null | undefined): boolean {
    if (!loanData) return false;
    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;
    return (
      typeof loanAmount === 'number' && loanAmount > 0 &&
      typeof interestRate === 'number' && interestRate > 0 && // Zinssatz muss > 0 sein
      typeof initialRepayment === 'number' && initialRepayment > 0 && // Tilgung muss > 0 sein
      typeof interestFixation === 'number' && interestFixation > 0
    );
  }

  // --- Private Helper Methods ---

  /**
   * Berechnet die konstante monatliche Rate.
   * Stellt sicher, dass die Rate mindestens die Zinsen des ersten Monats deckt.
   */
  private calculateMonthlyPayment(loanAmount: number, interestRate: number, initialRepayment: number): number {
    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;

    // 1. Berechne die Rate basierend auf der gewünschten anfänglichen Tilgung
    const desiredAnnualPayment = loanAmount * (interestRate / this.PERCENT_FACTOR + initialRepayment / this.PERCENT_FACTOR);
    const desiredMonthlyPayment = this.round(desiredAnnualPayment / this.MONTHS_IN_YEAR);

    // 2. Berechne die Rate, die nur die Zinsen des ersten Monats deckt
    const firstMonthInterest = this.round(loanAmount * monthlyInterestRate);

    // 3. Wähle die höhere der beiden Raten, um sicherzustellen, dass Zinsen immer gedeckt sind
    //    und eine (minimale) Tilgung stattfindet, wenn Zins = 0 wäre (theoretisch)
    //    Wenn firstMonthInterest 0 ist, wird desiredMonthlyPayment verwendet (da initialRepayment > 0 sein muss).
    return Math.max(desiredMonthlyPayment, firstMonthInterest);
  }

  /**
   * Erstellt den Auszahlungseintrag.
   */
  private createDisbursementEntry(loanAmount: number, date: Date): AmortizationEntry {
    return {
      date: date,
      remainingDebt: this.round(-loanAmount),
      interest: 0.00,
      repayment: this.round(-loanAmount),
      payment: this.round(-loanAmount)
    };
  }

  /**
   * Berechnet den nächsten Tilgungsplan-Eintrag (Ratenzahlung).
   * Berücksichtigt den Fall, dass die Tilgung die Restschuld übersteigen könnte.
   */
  private calculateNextEntry(
    previousRemainingDebt: number,
    monthlyPayment: number,
    monthlyInterestRate: number,
    currentDate: Date
  ): AmortizationEntry {
    const interest = this.round(-previousRemainingDebt * monthlyInterestRate);

    // Theoretische Tilgung berechnen
    let repaymentInternal = monthlyPayment - interest;

    // Positive Restschuld für Vergleich
    const remainingDebtPositive = -previousRemainingDebt;

    // Sicherstellen, dass die Tilgung nicht höher ist als die (positive) Restschuld
    // Dies ist wichtig für die letzte Rate oder wenn die Rate nur knapp die Zinsen deckt.
    if (repaymentInternal > remainingDebtPositive) {
      repaymentInternal = remainingDebtPositive; // Tilgung auf die exakte Restschuld begrenzen
    }

    // Neue Restschuld berechnen und runden
    let newRemainingDebt = this.round(previousRemainingDebt + repaymentInternal);

    // Korrektur: Wenn die Restschuld extrem nahe bei Null ist, auf Null setzen.
    // Wichtig nach der Begrenzung der Tilgung.
    if (Math.abs(newRemainingDebt) < 0.005) {
        newRemainingDebt = 0;
    }

    // Die tatsächliche Zahlung für diesen Monat ist Zins + tatsächliche Tilgung
    // Normalerweise ist das `monthlyPayment`, aber bei der letzten Rate kann es weniger sein.
    const actualPayment = this.round(interest + repaymentInternal);

    return {
      date: new Date(currentDate),
      remainingDebt: newRemainingDebt,
      interest: interest,
      repayment: this.round(repaymentInternal), // Gerundeter Wert für Anzeige/Summe
      payment: actualPayment // Kann von monthlyPayment abweichen (letzte Rate)
    };
  }

  /**
   * Erstellt einen "Nullzeilen"-Eintrag, wenn das Darlehen bereits getilgt ist.
   */
  private createZeroEntry(currentDate: Date): AmortizationEntry {
    return {
      date: new Date(currentDate),
      remainingDebt: 0,
      interest: 0,
      repayment: 0,
      payment: 0
    };
  }

  /**
   * Ermittelt das Datum des letzten Tages des aktuellen Monats.
   */
  private getActualMonthEndDate(date: Date): Date {
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  /**
   * Ermittelt das Datum des letzten Tages des nächsten Monats.
   */
  private getNextMonthEndDate(date: Date): Date {
      return new Date(date.getFullYear(), date.getMonth() + 2, 0);
  }

  /**
   * Führt eine kaufmännische Rundung auf zwei Nachkommastellen durch.
   */
  private round(value: number): number {
    if (isNaN(value) || !isFinite(value)) {
      console.warn(`Rounding encountered invalid value: ${value}. Returning 0.`);
      return 0;
    }
    return parseFloat(value.toFixed(2));
  }
}