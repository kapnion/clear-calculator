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
  providedIn: 'root' // Stellt den Service global zur Verfügung
})
export class AmortizationService {

  // Konstanten für bessere Lesbarkeit und Wartbarkeit
  private readonly MONTHS_IN_YEAR = 12;
  private readonly PERCENT_FACTOR = 100;

  /**
   * Berechnet den detaillierten monatlichen Tilgungsplan für ein Darlehen.
   * Berücksichtigt eine konstante Rate, die sich aus dem anfänglichen Zins
   * und der anfänglichen (jährlichen) Tilgungsrate ergibt.
   *
   * @param loanData Die Eingabedaten für das Darlehen.
   * @returns Ein Array von AmortizationEntry-Objekten, das den Plan darstellt.
   */
  calculateAmortizationPlan(loanData: LoanData): AmortizationEntry[] {
    // Validierung der Eingabedaten (obwohl extern hoffentlich geprüft, zur Sicherheit)
    if (!this.isValidLoanData(loanData)) {
      console.error("Invalid loan data provided to calculateAmortizationPlan.");
      return []; // Leeren Plan zurückgeben bei ungültigen Daten
    }

    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;

    // Monatlichen Zinssatz berechnen
    const monthlyInterestRate = interestRate / this.PERCENT_FACTOR / this.MONTHS_IN_YEAR;
    // Gesamtzahl der Ratenzahlungen
    const numberOfPayments = interestFixation * this.MONTHS_IN_YEAR;

    // Konstante monatliche Rate berechnen
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, interestRate, initialRepayment);

    const amortizationEntries: AmortizationEntry[] = [];
    let currentDate = this.getActualMonthEndDate(new Date()); // Startdatum Auszahlung (letzter Tag aktueller Monat)
    let remainingDebt = -loanAmount; // Start-Restschuld (negativ)

    // 1. Auszahlungseintrag hinzufügen
    amortizationEntries.push(this.createDisbursementEntry(loanAmount, currentDate));

    // Startdatum für die erste Tilgungsrate (letzter Tag nächster Monat)
    currentDate = this.getNextMonthEndDate(currentDate);

    // 2. Tilgungsplan-Einträge für jede Rate generieren
    for (let i = 0; i < numberOfPayments; i++) {
      // Den letzten Eintrag holen, um die aktuelle Restschuld zu bekommen
      // (Alternative: `remainingDebt` Variable weiterverwenden, aber so ist es klarer an die Struktur gebunden)
      const previousEntry = amortizationEntries[amortizationEntries.length - 1];

      // Nächsten Eintrag im Plan berechnen
      const nextEntry = this.calculateNextEntry(
        previousEntry.remainingDebt, // Verwende gerundeten Wert vom Vorgänger
        monthlyPayment,
        monthlyInterestRate,
        currentDate
      );
      amortizationEntries.push(nextEntry);
      // Update der lokalen `remainingDebt` Variable (optional, da `previousEntry.remainingDebt` verwendet wird)
      remainingDebt = nextEntry.remainingDebt;

      // Datum für den nächsten Eintrag vorbereiten
      currentDate = this.getNextMonthEndDate(currentDate);
    }

    return amortizationEntries;
  }

  /**
   * Berechnet die Zusammenfassungsdaten (Restschuld, Gesamtzinsen, Gesamttilgung)
   * aus einem bestehenden Tilgungsplan.
   *
   * @param amortizationPlan Ein Array von AmortizationEntry-Objekten.
   * @returns Ein SummaryData-Objekt mit den berechneten Summen.
   */
  calculateSummaryData(amortizationPlan: AmortizationEntry[]): SummaryData {
    // Initialisiere Summen
    let totalInterestPaid = 0;
    let totalRepaymentPaid = 0;

    // Prüfe, ob der Plan überhaupt Einträge hat (mindestens Auszahlung)
    if (!amortizationPlan || amortizationPlan.length === 0) {
      return { remainingDebt: 0, totalInterestPaid: 0, totalRepaymentPaid: 0 };
    }

    // Iteriere über den Plan, beginnend *nach* der Auszahlung (Index 1)
    // um nur tatsächliche Zins- und Tilgungszahlungen zu summieren.
    for (let i = 1; i < amortizationPlan.length; i++) {
        totalInterestPaid += amortizationPlan[i].interest;
        // Summiere die gerundeten Tilgungsbeträge, wie sie im Plan stehen
        totalRepaymentPaid += amortizationPlan[i].repayment;
    }

    // Letzten Eintrag für die finale Restschuld holen
    const lastEntry = amortizationPlan[amortizationPlan.length - 1];
    // Nimm die bereits gerundete Restschuld aus dem letzten Eintrag
    // Wenn lastEntry nicht existiert (sollte bei leerem Array nicht passieren, aber sicher ist sicher), setze 0.
    const remainingDebt = lastEntry ? lastEntry.remainingDebt : 0;

    return {
      remainingDebt: remainingDebt, // Ist bereits gerundet
      totalInterestPaid: this.round(totalInterestPaid), // Summe zur Sicherheit runden
      totalRepaymentPaid: this.round(totalRepaymentPaid) // Summe zur Sicherheit runden
    };
  }

  /**
   * Validiert die Eingabedaten für die Darlehensberechnung.
   * Stellt sicher, dass alle Werte positiv sind.
   *
   * @param loanData Die zu validierenden Darlehensdaten.
   * @returns true, wenn die Daten gültig sind, andernfalls false.
   */
  isValidLoanData(loanData: LoanData | null | undefined): boolean {
    // Prüfe auf null oder undefined
    if (!loanData) {
      return false;
    }

    // Destrukturierung für einfacheren Zugriff
    const { loanAmount, interestRate, initialRepayment, interestFixation } = loanData;

    // Prüfe, ob alle Werte positive Zahlen sind
    return (
      typeof loanAmount === 'number' && loanAmount > 0 &&
      typeof interestRate === 'number' && interestRate > 0 &&
      typeof initialRepayment === 'number' && initialRepayment > 0 &&
      typeof interestFixation === 'number' && interestFixation > 0
    );
  }

  // --- Private Helper Methods ---

  /**
   * Berechnet die konstante monatliche Rate (Annuität).
   * Die Rate basiert auf der Summe des anfänglichen Jahreszinses und der
   * anfänglichen jährlichen Tilgung, geteilt durch die Anzahl der Monate.
   *
   * @param loanAmount Der Darlehensbetrag.
   * @param interestRate Der jährliche Sollzinssatz in Prozent.
   * @param initialRepayment Die anfängliche jährliche Tilgung in Prozent.
   * @returns Die gerundete, konstante monatliche Rate.
   */
  private calculateMonthlyPayment(loanAmount: number, interestRate: number, initialRepayment: number): number {
    // Berechne die gesamte jährliche Zahlung (Zins + Tilgung)
    const annualPayment = loanAmount * (interestRate / this.PERCENT_FACTOR + initialRepayment / this.PERCENT_FACTOR);
    // Teile durch Monate und runde kaufmännisch
    return this.round(annualPayment / this.MONTHS_IN_YEAR);
  }

  /**
   * Erstellt den ersten Eintrag im Tilgungsplan, der die Auszahlung darstellt.
   *
   * @param loanAmount Der Darlehensbetrag.
   * @param date Das Datum der Auszahlung (letzter Tag des aktuellen Monats).
   * @returns Das AmortizationEntry-Objekt für die Auszahlung.
   */
  private createDisbursementEntry(loanAmount: number, date: Date): AmortizationEntry {
    return {
      date: date, // Übergebenes Datum verwenden
      remainingDebt: this.round(-loanAmount), // Negative Restschuld
      interest: 0.00, // Keine Zinsen bei Auszahlung
      repayment: this.round(-loanAmount), // Auszahlungsbetrag (negativ)
      payment: this.round(-loanAmount)  // Rate entspricht Auszahlung (negativ)
    };
  }

  /**
   * Berechnet die Daten für den nächsten Tilgungsplan-Eintrag (eine Ratenzahlung).
   *
   * @param previousRemainingDebt Die Restschuld *vor* dieser Ratenzahlung (gerundet, negativ).
   * @param monthlyPayment Die konstante, gerundete monatliche Rate.
   * @param monthlyInterestRate Der monatliche Zinssatz (als Dezimalzahl).
   * @param currentDate Das Datum dieser Ratenzahlung (letzter Tag des Monats).
   * @returns Das AmortizationEntry-Objekt für diese Ratenzahlung.
   */
  private calculateNextEntry(
    previousRemainingDebt: number,
    monthlyPayment: number,
    monthlyInterestRate: number,
    currentDate: Date
  ): AmortizationEntry {
    // Zins berechnen (auf positive Basis der Restschuld) und runden
    const interest = this.round(-previousRemainingDebt * monthlyInterestRate);

    // Tilgung als Differenz berechnen (Rate und Zins sind bereits gerundet)
    // Dieser Wert kann intern leicht ungerundet sein, ist aber mathematisch korrekt
    const repaymentInternal = monthlyPayment - interest;

    // Neue Restschuld berechnen (vorherige Schuld + Tilgung) und runden
    const newRemainingDebt = this.round(previousRemainingDebt + repaymentInternal);

    return {
      date: new Date(currentDate), // Wichtig: Kopie des Datums erstellen!
      remainingDebt: newRemainingDebt, // Gerundeter Wert
      interest: interest, // Gerundeter Wert
      repayment: this.round(repaymentInternal), // Gerundeter Wert für Anzeige/Summe
      payment: monthlyPayment // Konstante, gerundete Rate
    };
  }

   /**
   * Ermittelt das Datum des letzten Tages des aktuellen Monats für ein gegebenes Datum.
   * @param date Ein Datumsobjekt.
   * @returns Ein neues Datumsobjekt, das den letzten Tag des Monats von 'date' repräsentiert.
   */
  private getActualMonthEndDate(date: Date): Date {
      // Geht zum ersten Tag des nächsten Monats (Monat + 1) und dann zum Tag 0 (letzter Tag des Vormonats)
      return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }


  /**
   * Ermittelt das Datum des letzten Tages des nächsten Monats für ein gegebenes Datum.
   * @param date Ein Datumsobjekt (sollte bereits ein Monatsende sein).
   * @returns Ein neues Datumsobjekt, das den letzten Tag des Folgemonats repräsentiert.
   */
  private getNextMonthEndDate(date: Date): Date {
      // Geht zum ersten Tag des aktuellen Monats (ausgehend vom Monatsende),
      // addiert 2 Monate (um im übernächsten Monat zu landen),
      // geht dann zum Tag 0 (was der letzte Tag des Vormonats, also des gewünschten nächsten Monats ist).
      return new Date(date.getFullYear(), date.getMonth() + 2, 0);
  }


  /**
   * Führt eine kaufmännische Rundung auf zwei Nachkommastellen durch.
   * Verwendet toFixed für konsistentes Runden bei Grenzfällen (z.B. .xx5).
   *
   * @param value Der zu rundende Zahlenwert.
   * @returns Der auf zwei Nachkommastellen gerundete Zahlenwert.
   */
  private round(value: number): number {
    // Prüfe auf NaN oder unendliche Werte, um Fehler zu vermeiden
    if (isNaN(value) || !isFinite(value)) {
        // Entscheide, wie du damit umgehst: 0 zurückgeben, Fehler werfen?
        console.warn(`Rounding encountered invalid value: ${value}. Returning 0.`);
        return 0;
    }
    // toFixed rundet kaufmännisch und gibt einen String zurück.
    // parseFloat wandelt den String zurück in eine Zahl.
    return parseFloat(value.toFixed(2));
  }
}