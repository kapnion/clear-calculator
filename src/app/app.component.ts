import { Component } from '@angular/core';

import { AmortizationService } from './services/amortization.service';

;
import { LoanFormComponent } from './components/loan-form/loan-form.component';
import { AmortizationTableComponent } from './components/amortization-table/amortization-table.component';
import { SummaryComponent } from './components/summary/summary.component';
import { AmortizationEntry } from './models/amortization-entry';
import { LoanData } from './models/loan-data';
import { SummaryData } from './models/summary-data';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoanFormComponent, AmortizationTableComponent, SummaryComponent], // Importiere die standalone Komponenten
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  providers: [AmortizationService] // Stelle den Service bereit
})
export class AppComponent {
  loanData: LoanData | null = null;
  amortizationPlan: AmortizationEntry[] | null = null;
  summaryData: SummaryData | null = null;
  calculationError: string | null = null; // Property für Fehlermeldung

  constructor(private amortizationService: AmortizationService) {}

  onLoanDataSubmitted(loanData: LoanData): void {
    // Setze Fehler und alte Daten zurück vor neuer Berechnung
    this.calculationError = null;
    this.amortizationPlan = null;
    this.summaryData = null;
    this.loanData = loanData; // Speichere die Eingabedaten

    // Prüfe Gültigkeit der Formulardaten (obwohl Formular es tun sollte)
    if (!this.amortizationService.isValidLoanData(loanData)) {
       this.calculationError = "Ungültige Eingabedaten."; // Sollte nicht passieren
       return;
    }

    try {
      // Rufe die Berechnungsmethode auf
      this.amortizationPlan = this.amortizationService.calculateAmortizationPlan(loanData);
      // Berechne Zusammenfassung nur bei erfolgreicher Plan-Erstellung
      this.summaryData = this.amortizationService.calculateSummaryData(this.amortizationPlan);
    } catch (error: any) {
 debugger;
      console.error("Error calculating amortization plan:", error);

      this.calculationError = error.message || "Ein unbekannter Fehler ist bei der Berechnung aufgetreten.";
      // Stelle sicher, dass keine alten Daten angezeigt werden
      this.amortizationPlan = null;
      this.summaryData = null;
    }
  }
}