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

   
    it('should throw InsufficientRateError when monthly payment barely covers first month interest', () => {
      // Use data where payment is <= interest
      const loanData: LoanData = { loanAmount: 100000, interestRate: 12, initialRepayment: 0.00001, interestFixation: 1 };
      expect(() => service.calculateAmortizationPlan(loanData)).toThrowError(InsufficientRateError);
    });

  -
    it('should calculate amortization plan correctly for a standard loan (1 year fixation)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(13); // 12 months + disbursement
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-100000, 2); // Initial disbursement
      // This loan is NOT paid off in 1 year with these params
      expect(amortizationPlan[12].remainingDebt).toBeCloseTo(-97953.56, 2);
    });

    
    it('should handle a 0% interest rate correctly (1 year fixation)', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 0, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(13);
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-10000, 2);
      // Loan is NOT paid off in 1 year
      expect(amortizationPlan[12].remainingDebt).toBeCloseTo(-9000.04, 2);
    });

    it('should handle a loan with a very small loan amount', () => {
      const loanData: LoanData = { loanAmount: 10, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBeGreaterThan(1); // Should have at least disbursement + 1 payment
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-10, 2);
      // We could calculate expected balance, but just checking it runs is okay here
      expect(amortizationPlan[amortizationPlan.length - 1].remainingDebt).toBeLessThan(0);
    });

    
    it('should handle a loan with a long interest fixation period (20 years)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 20 }; // Takes ~21.5 years to pay off
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      expect(amortizationPlan.length).toBe(241); // 20 years * 12 months + disbursement
      expect(amortizationPlan[0].remainingDebt).toBeCloseTo(-100000, 2);
      // Loan is NOT paid off after 20 years
      expect(amortizationPlan[240].remainingDebt).toBeCloseTo(-31495.88, 2);
    });

   
    it('should handle a loan where the final payment is slightly different due to rounding (1 year fixation)', () => {
      const loanData: LoanData = { loanAmount: 1000, interestRate: 3, initialRepayment: 5, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const lastEntry = amortizationPlan[amortizationPlan.length - 1];
      // Loan is NOT paid off in 1 year
      expect(lastEntry.remainingDebt).toBeCloseTo(-949.28, 2);
    });

    it('should calculate correct interest and principal payments for the first month', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);

      // Check the first month's interest and principal
      const firstPaymentEntry = amortizationPlan[1];
      const monthlyInterestRate = loanData.interestRate / 100 / 12;
      const expectedInterest = 10000 * monthlyInterestRate; // Interest on initial amount

      expect(firstPaymentEntry.interest).toBeCloseTo(expectedInterest, 2);
      // Repayment is the total payment minus the interest paid in that specific month
      expect(firstPaymentEntry.repayment).toBeCloseTo(firstPaymentEntry.payment - firstPaymentEntry.interest, 2);
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

    it('should calculate summary data correctly for a standard amortization plan (1 year fixation)', () => {
      const loanData: LoanData = { loanAmount: 100000, interestRate: 5, initialRepayment: 2, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const summaryData: SummaryData = service.calculateSummaryData(amortizationPlan);

      const expectedRemainingDebt = amortizationPlan[amortizationPlan.length - 1].remainingDebt;
      const expectedTotalRepaymentPaid = amortizationPlan
        .slice(1) // Skip disbursement
        .reduce((sum, entry) => sum + entry.repayment, 0);
      const expectedTotalInterestPaid = amortizationPlan
        .slice(1)
        .reduce((sum, entry) => sum + entry.interest, 0);


      expect(summaryData.remainingDebt).toBeCloseTo(expectedRemainingDebt, 2); // Should be -97953.56
      expect(summaryData.totalInterestPaid).toBeCloseTo(expectedTotalInterestPaid, 2);
      expect(summaryData.totalInterestPaid).toBeGreaterThan(0);
      expect(summaryData.totalRepaymentPaid).toBeCloseTo(expectedTotalRepaymentPaid, 2);
    });

   

    it('should calculate summary data correctly for a 0% interest loan (1 year fixation)', () => {
      const loanData: LoanData = { loanAmount: 10000, interestRate: 0, initialRepayment: 10, interestFixation: 1 };
      const amortizationPlan: AmortizationEntry[] = service.calculateAmortizationPlan(loanData);
      const summaryData: SummaryData = service.calculateSummaryData(amortizationPlan);

      const expectedRemainingDebt = amortizationPlan[amortizationPlan.length - 1].remainingDebt;
      const expectedTotalRepaymentPaid = amortizationPlan
        .slice(1)
        .reduce((sum, entry) => sum + entry.repayment, 0);

      expect(summaryData.remainingDebt).toBeCloseTo(expectedRemainingDebt, 2); // Should be -9000.04
      expect(summaryData.totalInterestPaid).toBe(0);
      expect(summaryData.totalRepaymentPaid).toBeCloseTo(expectedTotalRepaymentPaid, 2); // Should be 999.96
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