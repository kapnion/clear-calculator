import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

import { CommonModule } from '@angular/common';
import { AmortizationEntry } from '../../models/amortization-entry';

@Component({
  selector: 'app-amortization-table',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './amortization-table.component.html',
  styleUrls: ['./amortization-table.component.scss']
})
export class AmortizationTableComponent implements OnChanges {
  @Input() amortizationPlan: AmortizationEntry[] | null = null;

  // Constants for better maintainability
  private static readonly DISPLAYED_COLUMNS = ['date', 'remainingDebt', 'interest', 'repayment', 'payment'] as const;
  private static readonly LOCALE = 'de-DE';
  private static readonly CURRENCY = 'EUR';

  readonly displayedColumns: string[] = [...AmortizationTableComponent.DISPLAYED_COLUMNS];
  dataSource: AmortizationEntry[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['amortizationPlan'] && this.amortizationPlan) {
      this.dataSource = [...this.amortizationPlan]; 
    }
  }
  /**
   * Formats a date according to the German locale.
   * @param date The date to format
   * @returns Formatted date string
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString(AmortizationTableComponent.LOCALE);
  }

  /**
   * Formats a number as currency according to the German locale.
   * @param value The numeric value to format
   * @returns Formatted currency string
   */
  formatCurrency(value: number): string {
    return value.toLocaleString(AmortizationTableComponent.LOCALE, { 
      style: 'currency', 
      currency: AmortizationTableComponent.CURRENCY 
    });
  }
}