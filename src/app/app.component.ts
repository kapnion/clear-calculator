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

  constructor(private amortizationService: AmortizationService) {}

  onLoanDataSubmitted(loanData: LoanData): void {
    if (this.amortizationService.isValidLoanData(loanData)) {
      this.loanData = loanData;
      this.amortizationPlan = this.amortizationService.calculateAmortizationPlan(loanData);
      this.summaryData = this.amortizationService.calculateSummaryData(this.amortizationPlan);
    } else {
      //Ungültige Daten behandeln (z.B. Fehlermeldung anzeigen)
      alert("Bitte geben Sie gültige Darlehensdaten ein.");
      this.amortizationPlan = null;
      this.summaryData = null;
    }
  }
}