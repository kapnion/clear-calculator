import { TestBed } from '@angular/core/testing';

import { AmortizationService } from './amortization.service';
import { LoanData } from '../models/loan-data';
import { AmortizationEntry } from '../models/amortization-entry';
import { SummaryData } from '../models/summary-data';

describe('AmortizationService', () => {
  let service: AmortizationService;

  // Beispiel-Daten, die exakt die erwarteten Ergebnisse liefern sollen
  const exampleLoanData: LoanData = {
    loanAmount: 100000,
    interestRate: 2.12,
    initialRepayment: 2,
    interestFixation: 10,
  };

  // Erwartete Werte für das Beispiel (Auszüge)
  const expectedFirstPaymentEntry: Partial<AmortizationEntry> = {
    // Datum wird dynamisch sein, daher nicht hier prüfen
    remainingDebt: -99833.34,
    interest: 176.67,
    repayment: 166.66,
    payment: 343.33,
  };

  const expectedLastPaymentEntry: Partial<AmortizationEntry> = {
    // Datum wird dynamisch sein, daher nicht hier prüfen
    remainingDebt: -77744.14, // Wichtig: Der erwartete Endwert
    interest: 137.71,
    repayment: 205.62,
    payment: 343.33,
  };

  const expectedSummaryData: SummaryData = {
    remainingDebt: -77744.14,
    totalInterestPaid: 18943.74,
    totalRepaymentPaid: 22255.86, // Summe der Tilgungen (ohne Auszahlung)
  };


  beforeEach(() => {
    TestBed.configureTestingModule({}); // Einfaches Setup, da keine komplexen Abhängigkeiten
    service = TestBed.inject(AmortizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- Tests für isValidLoanData ---
  describe('isValidLoanData', () => {
    it('should return true for valid data', () => {
      const validData: LoanData = { loanAmount: 1000, interestRate: 2, initialRepayment: 1, interestFixation: 5 };
      expect(service.isValidLoanData(validData)).toBeTrue();
    });

    it('should return false if loanData is null or undefined', () => {
      expect(service.isValidLoanData(null!)).toBeFalse();
      expect(service.isValidLoanData(undefined!)).toBeFalse();
    });

    it('should return false if loanAmount is zero or negative', () => {
      const data: LoanData = { loanAmount: 0, interestRate: 2, initialRepayment: 1, interestFixation: 5 };
      expect(service.isValidLoanData(data)).toBeFalse();
      data.loanAmount = -100;
      expect(service.isValidLoanData(data)).toBeFalse();
    });

    it('should return false if interestRate is zero or negative', () => {
      const data: LoanData = { loanAmount: 1000, interestRate: 0, initialRepayment: 1, interestFixation: 5 };
      expect(service.isValidLoanData(data)).toBeFalse();
      data.interestRate = -1;
      expect(service.isValidLoanData(data)).toBeFalse();
    });

     it('should return false if initialRepayment is zero or negative', () => {
      const data: LoanData = { loanAmount: 1000, interestRate: 2, initialRepayment: 0, interestFixation: 5 };
      expect(service.isValidLoanData(data)).toBeFalse();
      data.initialRepayment = -1;
      expect(service.isValidLoanData(data)).toBeFalse();
    });

     it('should return false if interestFixation is zero or negative', () => {
      const data: LoanData = { loanAmount: 1000, interestRate: 2, initialRepayment: 1, interestFixation: 0 };
      expect(service.isValidLoanData(data)).toBeFalse();
      data.interestFixation = -1;
      expect(service.isValidLoanData(data)).toBeFalse();
    });
  });

  // --- Tests für calculateAmortizationPlan ---
  describe('calculateAmortizationPlan', () => {

    let plan: AmortizationEntry[];
    let today: Date;
    let disbursementDate: Date;
    let firstPaymentDate: Date;

    beforeEach(() => {
      // Berechne den Plan einmal für die folgenden Tests
      plan = service.calculateAmortizationPlan(exampleLoanData);
      today = new Date();
      disbursementDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      firstPaymentDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    });

    it('should return an array with the correct number of entries', () => {
      const expectedNumberOfEntries = exampleLoanData.interestFixation * 12 + 1; // +1 für Auszahlung
      expect(plan).toBeInstanceOf(Array);
      expect(plan.length).toBe(expectedNumberOfEntries);
    });

    it('should have the correct disbursement entry (first entry)', () => {
      const disbursementEntry = plan[0];
      expect(disbursementEntry.date.getFullYear()).toBe(disbursementDate.getFullYear());
      expect(disbursementEntry.date.getMonth()).toBe(disbursementDate.getMonth());
      expect(disbursementEntry.date.getDate()).toBe(disbursementDate.getDate());
      expect(disbursementEntry.interest).toBe(0.00);
      expect(disbursementEntry.repayment).toBe(-exampleLoanData.loanAmount);
      expect(disbursementEntry.payment).toBe(-exampleLoanData.loanAmount);
      expect(disbursementEntry.remainingDebt).toBe(-exampleLoanData.loanAmount);
    });

     it('should have the correct first payment entry (second entry)', () => {
      const firstPaymentEntry = plan[1];
      expect(firstPaymentEntry.date.getFullYear()).toBe(firstPaymentDate.getFullYear());
      expect(firstPaymentEntry.date.getMonth()).toBe(firstPaymentDate.getMonth());
      expect(firstPaymentEntry.date.getDate()).toBe(firstPaymentDate.getDate());
      // Verwende toBeCloseTo für Fließkommazahlen zur Sicherheit, obwohl toBe hier funktionieren sollte
      expect(firstPaymentEntry.interest).toBeCloseTo(expectedFirstPaymentEntry.interest!, 2);
      expect(firstPaymentEntry.repayment).toBeCloseTo(expectedFirstPaymentEntry.repayment!, 2);
      expect(firstPaymentEntry.payment).toBeCloseTo(expectedFirstPaymentEntry.payment!, 2);
      expect(firstPaymentEntry.remainingDebt).toBeCloseTo(expectedFirstPaymentEntry.remainingDebt!, 2);
    });

    it('should have the correct last payment entry', () => {
      const lastPaymentEntry = plan[plan.length - 1];
      // Datum des letzten Eintrags prüfen (10 Jahre nach der ersten Zahlung)
      const expectedLastDate = new Date(firstPaymentDate.getFullYear() + exampleLoanData.interestFixation -1, firstPaymentDate.getMonth() + (exampleLoanData.interestFixation * 12 -1) % 12 +1, 0);


      expect(lastPaymentEntry.date.getFullYear()).toBe(expectedLastDate.getFullYear());
      expect(lastPaymentEntry.date.getMonth()).toBe(expectedLastDate.getMonth());
      expect(lastPaymentEntry.date.getDate()).toBe(expectedLastDate.getDate()); // Letzter Tag des Monats

      expect(lastPaymentEntry.interest).toBeCloseTo(expectedLastPaymentEntry.interest!, 2);
      expect(lastPaymentEntry.repayment).toBeCloseTo(expectedLastPaymentEntry.repayment!, 2);
      expect(lastPaymentEntry.payment).toBeCloseTo(expectedLastPaymentEntry.payment!, 2);
      expect(lastPaymentEntry.remainingDebt).toBeCloseTo(expectedLastPaymentEntry.remainingDebt!, 2);
    });

    it('should calculate dates correctly, including month/year rollovers', () => {
      // Test mit kurzer Laufzeit über Jahreswechsel
      const shortLoanData: LoanData = { loanAmount: 1000, interestRate: 1, initialRepayment: 5, interestFixation: 1 };
      const shortPlan = service.calculateAmortizationPlan(shortLoanData);

      expect(shortPlan.length).toBe(13); // 1 Auszahlung + 12 Raten

      const decEntryIndex = shortPlan.findIndex(e => e.date.getMonth() === 11); // Dezember finden
      const janEntryIndex = shortPlan.findIndex(e => e.date.getMonth() === 0 && e.date.getFullYear() === shortPlan[decEntryIndex].date.getFullYear() + 1); // Januar im nächsten Jahr

      expect(decEntryIndex).toBeGreaterThan(0);
      expect(janEntryIndex).toBeGreaterThan(decEntryIndex); // Januar muss nach Dezember kommen
      expect(shortPlan[decEntryIndex].date.getDate()).toBe(31); // Dezember hat 31 Tage
      expect(shortPlan[janEntryIndex].date.getDate()).toBe(31); // Januar hat 31 Tage
    });

    it('should handle leap years correctly for February dates', () => {
       // Wähle Startdatum und Laufzeit so, dass ein Schaltjahr (z.B. 2028) enthalten ist
       // Wir müssen das aktuelle Datum manipulieren oder mocken, um dies zuverlässig zu testen.
       // Einfacher Ansatz: Berechne einen Plan, der definitiv ein Schaltjahr enthält.
       const leapYearLoanData: LoanData = { loanAmount: 10000, interestRate: 2, initialRepayment: 2, interestFixation: 5 }; // 5 Jahre -> enthält sicher ein Schaltjahr
       const leapYearPlan = service.calculateAmortizationPlan(leapYearLoanData);

       // Finde Einträge für Februar in einem Schaltjahr (z.B. 2028) und Nicht-Schaltjahr (z.B. 2027)
       const feb2028Entry = leapYearPlan.find(e => e.date.getFullYear() === 2028 && e.date.getMonth() === 1); // Monat 1 = Februar
       const feb2027Entry = leapYearPlan.find(e => e.date.getFullYear() === 2027 && e.date.getMonth() === 1);

       if (feb2028Entry) {
         expect(feb2028Entry.date.getDate()).toBe(29); // Februar im Schaltjahr 2028 hat 29 Tage
       } else {
         // Fallback, falls der Testlauf nicht 2028 erreicht (unwahrscheinlich bei 5 Jahren)
         console.warn("Leap year test did not find Feb 2028 entry.");
       }

       if (feb2027Entry) {
         expect(feb2027Entry.date.getDate()).toBe(28); // Februar im Nicht-Schaltjahr 2027 hat 28 Tage
       } else {
         console.warn("Leap year test did not find Feb 2027 entry.");
       }
       // Man könnte auch spezifischere Daten mocken, um dies deterministischer zu machen.
    });

  });

  // --- Tests für calculateSummaryData ---
  describe('calculateSummaryData', () => {

    it('should calculate correct summary for the example plan', () => {
      // Erzeuge den Plan mit den bekannten Daten
      const plan = service.calculateAmortizationPlan(exampleLoanData);
      const summary = service.calculateSummaryData(plan);

      expect(summary.remainingDebt).toBeCloseTo(expectedSummaryData.remainingDebt, 2);
      expect(summary.totalInterestPaid).toBeCloseTo(expectedSummaryData.totalInterestPaid, 2);
      expect(summary.totalRepaymentPaid).toBeCloseTo(expectedSummaryData.totalRepaymentPaid, 2);
    });

    it('should return zero summary for an empty plan', () => {
      const summary = service.calculateSummaryData([]);
      expect(summary.remainingDebt).toBe(0);
      expect(summary.totalInterestPaid).toBe(0);
      expect(summary.totalRepaymentPaid).toBe(0);
    });

     it('should return correct summary for a plan with only disbursement', () => {
       const disbursementEntry: AmortizationEntry = {
         date: new Date(),
         remainingDebt: -10000,
         interest: 0,
         repayment: -10000,
         payment: -10000
       };
       const summary = service.calculateSummaryData([disbursementEntry]);
       expect(summary.remainingDebt).toBe(-10000); // Letzte Restschuld ist die Auszahlung
       expect(summary.totalInterestPaid).toBe(0);   // Schleife wird übersprungen
       expect(summary.totalRepaymentPaid).toBe(0);  // Schleife wird übersprungen
     });
  });

  // --- Test für die Rundungsfunktion (optional, da implizit getestet) ---
  describe('round (private method test - optional)', () => {
    it('should round numbers correctly to two decimal places', () => {
      // Zugriff auf private Methode für Testzwecke (nicht immer empfohlen)
      const privateService = service as any;
      expect(privateService.round(123.456)).toBe(123.46);
      expect(privateService.round(123.454)).toBe(123.45);
      expect(privateService.round(123.455)).toBe(123.46); // Kaufmännisches Runden
      expect(privateService.round(100)).toBe(100.00);
      expect(privateService.round(1.005)).toBe(1.01);
    });
  });

});