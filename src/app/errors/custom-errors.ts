export class InvalidLoanDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidLoanDataError';
  }
}

export class InsufficientRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientRateError';
  }
}
