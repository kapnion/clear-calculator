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
   * Wirft einen Fehler, wenn die berechnete Rate die anfänglichen Zinsen nicht deckt.
   *
   * @param loanData Die Eingabedaten für das Darlehen.
   * @returns Ein Array von AmortizationEntry-Objekten, das den Plan darstellt.
   * @throws Error, wenn die Rate die Zinsen nicht deckt.
   */
  calculateAmortizationPlan(loanData: LoanData): AmortizationEntry[] {
    if (!this.isValidLoanData(loanData)) {
      // Technisch gesehen sollte dies nicht passieren, wenn das Formular validiert
      throw new Error("Ungültige Darlehensdaten übergeben.");
    }

    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;
    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;
    const numberOfPayments = interestFixation * this.MONTHS_IN_YEAR;

    // Konstante monatliche Rate berechnen (strikt nach initialer Tilgung)
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, initialRepayment);
debugger;
    const firstMonthInterest = this.round(loanAmount * monthlyInterestRate);

    // Prüfen, ob die Rate die Zinsen des ersten Monats deckt UND eine Tilgung ermöglicht
    // Wenn Rate <= Zins, ist die Tilgung im ersten Monat <= 0.
    if (monthlyPayment <= firstMonthInterest) {
      // Erstelle eine spezifische Fehlermeldung
      let errorMsg = `Die berechnete monatliche Rate (${monthlyPayment.toFixed(2)} €) ist nicht ausreichend, um die Zinsen des ersten Monats (${firstMonthInterest.toFixed(2)} €) vollständig zu decken und gleichzeitig eine Tilgung zu ermöglichen.`;
      if (monthlyPayment === firstMonthInterest) {
        errorMsg = `Die berechnete monatliche Rate (${monthlyPayment.toFixed(2)} €) deckt exakt die Zinsen des ersten Monats (${firstMonthInterest.toFixed(2)} €). Es findet keine Tilgung statt, das Darlehen wird nicht zurückgezahlt.`;
      }
      errorMsg += " Bitte Zinssatz verringern oder anfängliche Tilgung erhöhen.";
      throw new Error(errorMsg);
    }

    const amortizationEntries: AmortizationEntry[] = [];
    let currentDate = this.getActualMonthEndDate(new Date());
    let remainingDebt = -loanAmount;

    amortizationEntries.push(this.createDisbursementEntry(loanAmount, currentDate));
    currentDate = this.getNextMonthEndDate(currentDate);

    for (let i = 0; i < numberOfPayments; i++) {
      const previousEntry = amortizationEntries[amortizationEntries.length - 1];

      // Prüfung auf bereits getilgt (mit kleiner Toleranz)
      if (Math.abs(previousEntry.remainingDebt) < 0.005) {
        amortizationEntries.push(this.createZeroEntry(currentDate));
      } else {
        // Berechne nächsten Eintrag (mit Logik zur Begrenzung der letzten Rate)
        const nextEntry = this.calculateNextEntry(
          previousEntry.remainingDebt,
          monthlyPayment,
          monthlyInterestRate,
          currentDate
        );
        amortizationEntries.push(nextEntry);
        remainingDebt = nextEntry.remainingDebt; // Nur zur Info, wird nicht mehr direkt gebraucht
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
    // Stellt sicher, dass alle Werte positive Zahlen sind
    return (
      typeof loanAmount === 'number' && loanAmount > 0 &&
      typeof interestRate === 'number' && interestRate > 0 &&
      typeof initialRepayment === 'number' && initialRepayment > 0 &&
      typeof interestFixation === 'number' && interestFixation > 0
    );
  }


  // --- Private Helper Methods ---

  /**
   * Berechnet die konstante monatliche Rate (strikt nach anfänglicher Tilgung).
   */
  private calculateMonthlyPayment(loanAmount: number, interestRate: number, initialRepayment: number): number {
    const annualPayment = loanAmount * (interestRate / this.PERCENT_FACTOR + initialRepayment / this.PERCENT_FACTOR);
    return this.round(annualPayment / this.MONTHS_IN_YEAR);
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
   * Beinhaltet Logik zur Begrenzung der letzten Rate auf die Restschuld.
   */
  private calculateNextEntry(
    previousRemainingDebt: number,
    monthlyPayment: number,
    monthlyInterestRate: number,
    currentDate: Date
  ): AmortizationEntry {
    const interest = this.round(-previousRemainingDebt * monthlyInterestRate);
    let repaymentInternal = monthlyPayment - interest;
    const remainingDebtPositive = -previousRemainingDebt;

    // Begrenze Tilgung auf Restschuld (wichtig für letzte Rate)
    if (repaymentInternal > remainingDebtPositive) {
      repaymentInternal = remainingDebtPositive;
    }

    let newRemainingDebt = this.round(previousRemainingDebt + repaymentInternal);

    // Setze auf exakt 0, wenn sehr nah dran
    if (Math.abs(newRemainingDebt) < 0.005) {
        newRemainingDebt = 0;
    }

    // Die tatsächliche Zahlung ist Zins + tatsächliche Tilgung
    const actualPayment = this.round(interest + repaymentInternal);

    return {
      date: new Date(currentDate),
      remainingDebt: newRemainingDebt,
      interest: interest,
      repayment: this.round(repaymentInternal),
      payment: actualPayment // Kann von monthlyPayment abweichen (letzte Rate)
    };
  }

  /**
   * Erstellt einen "Nullzeilen"-Eintrag.
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