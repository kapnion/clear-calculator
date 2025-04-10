import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';
import { SummaryData } from '../../models/summary-data';

@Component({
  selector: 'app-summary',
  standalone: true,
  imports: [CommonModule], // Benötigte Module importieren
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnChanges {
  @Input() summaryData: SummaryData | null = null;

  remainingDebtFormatted: string = '';
  totalInterestPaidFormatted: string = '';
  totalRepaymentPaidFormatted: string = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['summaryData'] && this.summaryData) {
      this.remainingDebtFormatted = this.formatCurrency(this.summaryData.remainingDebt);
      this.totalInterestPaidFormatted = this.formatCurrency(this.summaryData.totalInterestPaid);
      this.totalRepaymentPaidFormatted = this.formatCurrency(this.summaryData.totalRepaymentPaid);
    } else {
      this.remainingDebtFormatted = '';
      this.totalInterestPaidFormatted = '';
      this.totalRepaymentPaidFormatted = '';
    }
  }


  formatCurrency(value: number): string {
    return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
}
