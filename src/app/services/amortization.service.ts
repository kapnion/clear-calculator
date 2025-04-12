import { Injectable } from '@angular/core';
import { AmortizationEntry } from '../models/amortization-entry';
import { LoanData } from '../models/loan-data';
import { SummaryData } from '../models/summary-data';
import { InvalidLoanDataError, InsufficientRateError } from '../errors/custom-errors';
import { roundToTwoDecimals, getMonthEndDate, getNextMonthEndDate } from '../utils/helpers';

/**
 * @Injectable
 * Service für die Berechnung von Tilgungsplänen und Zusammenfassungen für Kredite.
 *
 * Dieser Service kapselt die Logik zur Berechnung von Amortisationsplänen
 * und bietet Methoden zur Validierung von Kreditdaten und zur Erstellung
 * von Zusammenfassungen.
 */
@Injectable({
  providedIn: 'root' // Stellt sicher, dass der Service als Singleton in der gesamten Anwendung verfügbar ist.
})
export class AmortizationService {
  private readonly MONTHS_IN_YEAR = 12; // Konstante für die Anzahl der Monate in einem Jahr
  private readonly PERCENT_FACTOR = 100; // Konstante für den Umrechnungsfaktor von Prozent
  private readonly ZERO_THRESHOLD = 0.005; // Toleranzwert für Null-Vergleiche (halber Cent).  Wird verwendet, um Rundungsfehler zu berücksichtigen.

  /**
   * calculateAmortizationPlan
   * Berechnet den Tilgungsplan für einen Kredit basierend auf den übergebenen Kreditdaten.
   *
   * @param loanData: LoanData - Die Kreditdaten, die für die Berechnung des Tilgungsplans verwendet werden.
   * @returns AmortizationEntry[] - Ein Array von AmortizationEntry-Objekten, das den Tilgungsplan darstellt.
   * @throws InvalidLoanDataError - Wenn die Kreditdaten ungültig sind.
   * @throws InsufficientRateError - Wenn die monatliche Rate nicht ausreicht, um die Zinsen zu decken.
   */
  calculateAmortizationPlan(loanData: LoanData): AmortizationEntry[] {
    // Validiert die übergebenen Kreditdaten.
    if (!this.isValidLoanData(loanData)) {
      throw new InvalidLoanDataError("Ungültige Kreditdaten. Alle Werte müssen positive Zahlen sein.");
    }

    // Extrahiert die benötigten Daten aus dem LoanData-Objekt.
    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;

    // Berechnet den monatlichen Zinssatz.
    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;
    // Berechnet die Anzahl der Zahlungen basierend auf der Zinsbindungsfrist.
    const numberOfPayments = interestFixation * this.MONTHS_IN_YEAR;
    // Berechnet die monatliche Rate.
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, initialRepayment);
    // Berechnet die Zinsen für den ersten Monat.
    const firstMonthInterest = roundToTwoDecimals(loanAmount * monthlyInterestRate);

    // Überprüft, ob die monatliche Rate ausreicht, um die Zinsen zu decken.
    if (monthlyPayment <= firstMonthInterest + this.ZERO_THRESHOLD) {
      let errorMsg = `Die berechnete monatliche Rate (${monthlyPayment.toFixed(2)} €) ist nicht ausreichend, um die Zinsen des ersten Monats (${firstMonthInterest.toFixed(2)} €) zu decken und eine Tilgung zu ermöglichen.`;
      if (Math.abs(monthlyPayment - firstMonthInterest) < this.ZERO_THRESHOLD) {
        errorMsg = `Die berechnete monatliche Rate (${monthlyPayment.toFixed(2)} €) deckt exakt die Zinsen des ersten Monats (${firstMonthInterest.toFixed(2)} €). Es findet keine Tilgung statt.`;
      }
      errorMsg += " Bitte Zinssatz verringern oder anfängliche Tilgung erhöhen.";
      throw new InsufficientRateError(errorMsg);
    }

    // Initialisiert das Array für die Tilgungsplan-Einträge.
    const amortizationEntries: AmortizationEntry[] = [];
    // Setzt das aktuelle Datum auf das Ende des aktuellen Monats.
    let currentDate = getMonthEndDate(new Date());

    // Fügt den Auszahlungs-Eintrag hinzu.
    amortizationEntries.push(this.createDisbursementEntry(loanAmount, currentDate));
    // Setzt das aktuelle Datum auf das Ende des nächsten Monats.
    currentDate = getNextMonthEndDate(currentDate);

    // Iteriert über die Anzahl der Zahlungen und berechnet die einzelnen Tilgungsplan-Einträge.
    for (let i = 0; i < numberOfPayments; i++) {
      // Holt den vorherigen Saldo aus dem letzten Eintrag im Array.
      const previousBalance = amortizationEntries[amortizationEntries.length - 1].remainingDebt;

      // Wenn der vorherige Saldo nahe Null ist, wird ein Null-Eintrag erstellt.
      if (Math.abs(previousBalance) < this.ZERO_THRESHOLD) {
        amortizationEntries.push(this.createZeroEntry(currentDate));
      } else {
        // Berechnet den nächsten Zahlungs-Eintrag.
        const nextEntry = this.calculateNextPaymentEntry(
          previousBalance,
          monthlyPayment,
          monthlyInterestRate,
          currentDate
        );
        // Fügt den nächsten Eintrag zum Array hinzu.
        amortizationEntries.push(nextEntry);
      }
      // Setzt das aktuelle Datum auf das Ende des nächsten Monats.
      currentDate = getNextMonthEndDate(currentDate);
    }

    // Gibt den Tilgungsplan zurück.
    return amortizationEntries;
  }

  /**
   * calculateSummaryData
   * Berechnet die Zusammenfassungsdaten für einen Tilgungsplan.
   *
   * @param amortizationPlan: AmortizationEntry[] - Der Tilgungsplan, für den die Zusammenfassungsdaten berechnet werden sollen.
   * @returns SummaryData - Die berechneten Zusammenfassungsdaten.
   */
  calculateSummaryData(amortizationPlan: AmortizationEntry[]): SummaryData {
    // Überprüft, ob der Tilgungsplan gültig ist.
    if (!amortizationPlan || amortizationPlan.length === 0) {
      return { remainingDebt: 0, totalInterestPaid: 0, totalRepaymentPaid: 0 };
    }

    // Entfernt den ersten Eintrag (Auszahlung) aus dem Plan.
    const paymentEntries = amortizationPlan.slice(1);
    // Berechnet die Summe der gezahlten Zinsen.
    const totalInterestPaid = paymentEntries.reduce((sum, entry) => sum + entry.interest, 0);
    // Berechnet die Summe der gezahlten Tilgung.
    const totalRepaymentPaid = paymentEntries.reduce((sum, entry) => sum + entry.repayment, 0);

    // Holt den letzten Eintrag aus dem Plan.
    const lastEntry = amortizationPlan[amortizationPlan.length - 1];
    // Berechnet die verbleibende Schuld.
    const remainingDebt = lastEntry ? roundToTwoDecimals(lastEntry.remainingDebt) : 0;

    // Gibt die Zusammenfassungsdaten zurück.
    return {
      remainingDebt: remainingDebt, // Sollte negativ oder Null sein
      totalInterestPaid: roundToTwoDecimals(totalInterestPaid),
      totalRepaymentPaid: roundToTwoDecimals(totalRepaymentPaid)
    };
  }

  /**
   * isValidLoanData
   * Validiert die übergebenen Kreditdaten.
   *
   * @param loanData: LoanData | null | undefined - Die zu validierenden Kreditdaten.
   * @returns boolean - True, wenn die Kreditdaten gültig sind, andernfalls false.
   */
  isValidLoanData(loanData: LoanData | null | undefined): loanData is LoanData {
    if (!loanData) return false;
    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;
    return (
      typeof loanAmount === 'number' && loanAmount > 0 &&
      typeof interestRate === 'number' && interestRate >= 0 && // 0% ist erlaubt
      typeof initialRepayment === 'number' && initialRepayment > 0 &&
      typeof interestFixation === 'number' && interestFixation > 0
    );
  }

  // --- Private Helper Methods ---

  /**
   * calculateMonthlyPayment
   * Berechnet die monatliche Rate.
   *
   * @param loanAmount: number - Der Kreditbetrag.
   * @param interestRate: number - Der Zinssatz.
   * @param initialRepayment: number - Die anfängliche Tilgung.
   * @returns number - Die berechnete monatliche Rate.
   */
  private calculateMonthlyPayment(loanAmount: number, interestRate: number, initialRepayment: number): number {
    const annualPayment = loanAmount * (interestRate / this.PERCENT_FACTOR + initialRepayment / this.PERCENT_FACTOR);
    return roundToTwoDecimals(annualPayment / this.MONTHS_IN_YEAR);
  }

  /**
   * createDisbursementEntry
   * Erstellt einen Auszahlungs-Eintrag.
   *
   * @param loanAmount: number - Der Kreditbetrag.
   * @param date: Date - Das Datum der Auszahlung.
   * @returns AmortizationEntry - Der erstellte Auszahlungs-Eintrag.
   */
  private createDisbursementEntry(loanAmount: number, date: Date): AmortizationEntry {
    const roundedAmount = roundToTwoDecimals(loanAmount);
    return {
      date: date,
      remainingDebt: -roundedAmount, // Negativ, da es sich um eine Schuld handelt
      interest: 0.00,
      repayment: -roundedAmount, // Änderung des Kapitals für diesen Eintrag
      payment: -roundedAmount  // Cashflow für diesen Eintrag
    };
  }

  /**
   * calculateNextPaymentEntry
   * Berechnet den nächsten Tilgungsplan-Eintrag für einen regulären Zahlungsmonat.
   * Erwartet, dass previousBalance negativ oder Null ist.
   * Gibt positive Zinsen, positive Tilgung (Kapitalanteil), positive Zahlung zurück.
   * Gibt negative oder Null verbleibende Schuld zurück.
   *
   * @param previousBalance: number - Der vorherige Saldo.
   * @param monthlyPayment: number - Die monatliche Rate.
   * @param monthlyInterestRate: number - Der monatliche Zinssatz.
   * @param currentDate: Date - Das aktuelle Datum.
   * @returns AmortizationEntry - Der berechnete Tilgungsplan-Eintrag.
   */
  private calculateNextPaymentEntry(
    previousBalance: number,
    monthlyPayment: number,
    monthlyInterestRate: number,
    currentDate: Date
  ): AmortizationEntry {

    // Sicherstellen, dass previousBalance nicht positiv ist
    if (previousBalance > 0) {
      console.error("Ungültiger Zustand: previousBalance sollte negativ oder Null sein.", previousBalance);

      return this.createZeroEntry(currentDate);
    }

    // Berechne den positiven Zinsbetrag basierend auf dem absoluten Wert des negativen Saldos
    // Vermeide die Berechnung, wenn der Saldo bereits effektiv Null ist
    const interest = (Math.abs(previousBalance) < this.ZERO_THRESHOLD)
      ? 0.00
      : roundToTwoDecimals(-previousBalance * monthlyInterestRate);

    // Bestimme den Kapitalzahlungsanteil für eine Standardzahlung
    let principalPayment = roundToTwoDecimals(monthlyPayment - interest);

    // Nehme an, dass die tatsächliche Zahlung anfänglich die Standardmonatszahlung ist
    let actualPayment = monthlyPayment;

    // Hole den absoluten Wert der Schuld vor dieser Zahlung
    const absoluteBalanceBeforePayment = -previousBalance; // Wird positiv sein

    // --- Anpassung der letzten Zahlung ---
    // Überprüfe, ob das berechnete Kapital ausreicht, um die verbleibende Schuld zu begleichen,
    // oder ob die verbleibende Schuld selbst geringer ist als eine Standardkapitalzahlung.
    // Verwende ZERO_THRESHOLD für Vergleiche.
    // Stelle sicher, dass absoluteBalanceBeforePayment größer als Null ist, bevor du anpasst
    if (absoluteBalanceBeforePayment > 0 && principalPayment >= absoluteBalanceBeforePayment - this.ZERO_THRESHOLD) {
      // Diese Zahlung wird die Schuld begleichen. Passe Kapital und tatsächliche Zahlung an.
      principalPayment = absoluteBalanceBeforePayment; // Zahle genau das, was übrig ist (positiver Wert)
      actualPayment = roundToTwoDecimals(interest + principalPayment); // Die letzte Zahlung könnte niedriger sein
    }

    // Defensive Überprüfung: Stelle sicher, dass die Kapitalzahlung nicht negativ ist
    if (principalPayment < 0) {
      console.warn("Berechnete negative Kapitalzahlung während der Laufzeit. Der Zinssatz könnte unzureichend sein.", { interest, monthlyPayment });
      principalPayment = 0;
      actualPayment = roundToTwoDecimals(interest + principalPayment);
    }

    // Berechne den neuen Saldo: Addiere die positive Kapitalzahlung zum negativen vorherigen Saldo.
    let newBalance = roundToTwoDecimals(previousBalance + principalPayment);

    // --- Überprüfung des Nullsaldos ---
    // Stelle sicher, dass der Saldo genau Null ist, wenn er nach der Berechnung sehr nahe dran ist.
    if (Math.abs(newBalance) < this.ZERO_THRESHOLD) {
      newBalance = 0;
    }

    // Stelle sicher, dass die zurückgegebenen Werte konsistent gerundet sind
    return {
      date: new Date(currentDate),
      remainingDebt: newBalance, // Negativ oder Null
      interest: roundToTwoDecimals(interest), // Positiv
      repayment: roundToTwoDecimals(principalPayment), // Positiver Kapitalanteil
      payment: roundToTwoDecimals(actualPayment) // Positiver Zahlungsbetrag
    };
  }


  /**
   * createZeroEntry
   * Erstellt einen Null-Eintrag.
   *
   * @param currentDate: Date - Das aktuelle Datum.
   * @returns AmortizationEntry - Der erstellte Null-Eintrag.
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
}