import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';
import { AmortizationEntry } from '../../models/amortization-entry';

@Component({
  selector: 'app-amortization-table',
  standalone: true,
  imports: [CommonModule], // Benötigte Module importieren
  templateUrl: './amortization-table.component.html',
  styleUrls: ['./amortization-table.component.scss']
})
export class AmortizationTableComponent implements OnChanges {
  @Input() amortizationPlan: AmortizationEntry[] | null = null;

  displayedColumns: string[] = ['date', 'remainingDebt', 'interest', 'repayment', 'payment'];
  dataSource: AmortizationEntry[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['amortizationPlan'] && this.amortizationPlan) {
      this.dataSource = [...this.amortizationPlan]; // Create a new array for change detection
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('de-DE');
  }

  formatCurrency(value: number): string {
      return value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  }
}