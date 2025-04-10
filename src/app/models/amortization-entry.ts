export interface AmortizationEntry {
    date: Date;
    remainingDebt: number;
    interest: number;
    repayment: number;
    payment: number;
}
