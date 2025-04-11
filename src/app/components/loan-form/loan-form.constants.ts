export const FORM_CONTROLS = {
  LOAN_AMOUNT: 'loanAmount',
  INTEREST_RATE: 'interestRate',
  INITIAL_REPAYMENT: 'initialRepayment',
  INTEREST_FIXATION: 'interestFixation',
} as const;

export const VALIDATION_PARAMS = {
  MIN_LOAN_AMOUNT: 1,
  MIN_INTEREST_RATE: 0,
  MAX_PERCENTAGE: 100,
  MIN_FIXATION_YEARS: 1,
  MAX_FIXATION_YEARS: 100,
  INTEGER_PATTERN: /^[0-9]+$/,
} as const;
