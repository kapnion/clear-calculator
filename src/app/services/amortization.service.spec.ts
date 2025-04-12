import { AmortizationService } from './amortization.service';
import { LoanData } from '../models/loan-data';
import { AmortizationEntry } from '../models/amortization-entry';
import { InvalidLoanDataError, InsufficientRateError } from '../errors/custom-errors';
import { SummaryData } from '../models/summary-data';

describe('AmortizationService', () => {
  let service: AmortizationService;

  beforeEach(() => {
    service = new AmortizationService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateAmortizationPlan', () => {
    it('should throw InvalidLoanDataError for invalid loan data (null)', () => {
      expect(() => service.calculateAmortizationPlan(null as any)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InvalidLoanDataError for invalid loan data (undefined)', () => {
      expect(() => service.calculateAmortizationPlan(undefined as any)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InvalidLoanDataError for invalid loan data (loanAmount <= 0)', () => {
      const loanData: LoanData = { loanAmount: 0, interestRate: 5, initialRepayment: 2, interestFixation: 10 };
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InvalidLoanDataError for invalid loan data (interestRate < 0)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: -5, initialRepayment: 2, interestFixation: 10 };
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InvalidLoanDataError for invalid loan data (initialRepayment <= 0)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 0, interestFixation: 10 };
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InvalidLoanDataError for invalid loan data (interestFixation <= 0)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 0 };
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InvalidLoanDataError);
    });

    it('should throw InsufficientRateError when monthly payment is not enough to cover first month interest', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 10, initialRepayment: 0.1, interestFixation: 1 }; // Very low initialRepayment
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InsufficientRateError);
    });

    it('should calculate amortization plan correctly for a standard loan', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(13); // 12 months + disbursement
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-100000, 2); // Initial disbursement
      expect(amortizationPlan[12].remainingDebt).toBeCloseTo(0, 2); // Fully paid off
    });

    it('should calculate amortization plan correctly when the loan is paid off early', () => {
      const loanData: LoanData = { loanAmount: 5000, interestRate: 5, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const lastEntry = amortizationPlan[amortizationPlan.length - 1];

      expect(amortizationPlan.length).toBeLessThan(14); // Paid off before 12 months + disbursement
      expect(lastEntry.remainingDebt).toBeCloseTo(0, 2); // Remaining debt is zero
    });

    it('should handle a 0% interest rate correctly', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 0, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(13);
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-10000, 2);
      expect(amortizationPlan[12].remainingDebt).toBeCloseTo(0, 2);
    });

    it('should handle a loan with a very small loan amount', () => {
      const loanData: LoanData = { loanAmount: 10, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBeGreaterThan(1);
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-10, 2);
    });

    it('should handle a loan with a long interest fixation period', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 20 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(241); // 20 years * 12 months + disbursement
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-100000, 2);
      expect(amortizationPlan[240].remainingDebt).toBeCloseTo(0, 2);
    });

    it('should handle a loan where the final payment is slightly different due to rounding', () => {
      const loanData: LoanData = { loanAmount: 1000, interestRate: 3, initialRepayment: 5, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const lastEntry = amortizationPlan[amortizationPlan.length - 1];
      expect(lastEntry.remainingDebt).toBeCloseTo(0, 2);
    });

    it('should calculate correct interest and principal payments for each month', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      // Check the first month's interest and principal
      const firstMonth = amortizationPlan[1];
      const monthlyInterestRate = loanData.interestRate / 100 / 12;
      const expectedInterest = 10000 * monthlyInterestRate;
      expect(firstMonth.interest).toBeCloseTo(expectedInterest, 2);
      expect(firstMonth.repayment).toBeCloseTo(firstMonth.payment - expectedInterest, 2);
    });
  });

  describe('calculateSummaryData', () => {
    it('should return zero summary data for null amortization plan', () => {
      const summaryData: SummaryData = service.calculateSummaryData(null as any);
      expect(summaryData.remainingDebt).toBe(0);
      expect(summaryData.totalInterestPaid).toBe(0);
      expect(summaryData.totalRepaymentPaid).toBe(0);
    });

    it('should return zero summary data for empty amortization plan', () => {
      const summaryData: SummaryData = service.calculateSummaryData([]);
      expect(summaryData.remainingDebt).toBe(0);
      expect(summaryData.totalInterestPaid).toBe(0);
      expect(summaryData.totalRepaymentPaid).toBe(0);
    });

    it('should calculate summary data correctly for a standard amortization plan', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const summaryData: SummaryData = service.calculateSummaryData(amortizationPlan);

      expect(summaryData.remainingDebt).toBeCloseTo(0, 2);
      expect(summaryData.totalInterestPaid).toBeGreaterThan(0);
      expect(summaryData.totalRepaymentPaid).toBeCloseTo(loanData.loanAmount, 2);
    });

    it('should calculate summary data correctly when the loan is paid off early', () => {
      const loanData: LoanData = { loanAmount: 5000, interestRate: 5, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const summaryData: SummaryData = service.calculateSummaryData(amortizationPlan);

      expect(summaryData.remainingDebt).toBeCloseTo(0, 2);
      expect(summaryData.totalInterestPaid).toBeGreaterThan(0);
      expect(summaryData.totalRepaymentPaid).toBeCloseTo(loanData.loanAmount, 2);
    });

    it('should calculate summary data correctly for a 0% interest loan', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 0, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const summaryData: SummaryData = service.calculateSummaryData(amortizationPlan);

      expect(summaryData.remainingDebt).toBeCloseTo(0, 2);
      expect(summaryData.totalInterestPaid).toBe(0);
      expect(summaryData.totalRepaymentPaid).toBeCloseTo(loanData.loanAmount, 2);
    });
  });

  describe('isValidLoanData', () => {
    it('should return false for null loan data', () => {
      expect(service.isValidLoanData(null)).toBe(false);
    });

    it('should return false for undefined loan data', () => {
      expect(service.isValidLoanData(undefined)).toBe(false);
    });

    it('should return false for loanAmount <= 0', () => {
      const loanData: LoanData = { loanAmount: 0, interestRate: 5, initialRepayment: 2, interestFixation: 10 };
      expect(service.isValidLoanData(loanData)).toBe(false);
    });

    it('should return false for initialRepayment <= 0', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 0, interestFixation: 10 };
      expect(service.isValidLoanData(loanData)).toBe(false);
    });

    it('should return false for interestFixation <= 0', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 0 };
      expect(service.isValidLoanData(loanData)).toBe(false);
    });

    it('should return true for valid loan data', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 10 };
      expect(service.isValidLoanData(loanData)).toBe(true);
    });

    it('should return true for 0% interest rate', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 0, initialRepayment: 2, interestFixation: 10 };
      expect(service.isValidLoanData(loanData)).toBe(true);
    });
  });
});