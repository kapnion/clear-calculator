import { TestBed } from '@angular/core/testing';

import { AmortizationService } from './amortization.service';

describe('AmortizationService', () => {
  let service: AmortizationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AmortizationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
