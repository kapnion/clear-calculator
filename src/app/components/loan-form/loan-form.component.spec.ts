import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder, FormGroup, AbstractControl, Validators } from '@angular/forms';
import { LoanFormComponent } from './loan-form.component';
import { LoanData } from '../../models/loan-data';
import { FORM_CONTROLS, VALIDATION_PARAMS } from './loan-form.constants';
import { greaterThanZeroValidator } from './loan-form.validators';
import { CommonModule } from '@angular/common';
import { By } from '@angular/platform-browser';

describe('LoanFormComponent', () => {
  let component: LoanFormComponent;
  let fixture: ComponentFixture<LoanFormComponent>;
  let fb: FormBuilder;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactiveFormsModule, CommonModule, LoanFormComponent],
      providers: [FormBuilder]
    }).compileComponents();

    fixture = TestBed.createComponent(LoanFormComponent);
    component = fixture.componentInstance;
    fb = TestBed.inject(FormBuilder);
    component.loanForm = fb.group({ 
      [FORM_CONTROLS.LOAN_AMOUNT]: ['', [Validators.required, Validators.min(VALIDATION_PARAMS.MIN_LOAN_AMOUNT)]],
      [FORM_CONTROLS.INTEREST_RATE]: ['', [Validators.required, Validators.min(VALIDATION_PARAMS.MIN_INTEREST_RATE), Validators.max(VALIDATION_PARAMS.MAX_PERCENTAGE)]],
      [FORM_CONTROLS.INITIAL_REPAYMENT]: ['', [Validators.required, greaterThanZeroValidator(), Validators.max(VALIDATION_PARAMS.MAX_PERCENTAGE)]],
      [FORM_CONTROLS.INTEREST_FIXATION]: ['', [Validators.required, Validators.min(VALIDATION_PARAMS.MIN_FIXATION_YEARS), Validators.max(VALIDATION_PARAMS.MAX_FIXATION_YEARS), Validators.pattern(VALIDATION_PARAMS.INTEGER_PATTERN)]]
    });
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize the form', () => {
    expect(component.loanForm).toBeDefined();
    expect(component.loanForm instanceof FormGroup).toBeTrue();
  });

  it('should be invalid when no values are entered', () => {
    expect(component.loanForm.valid).toBeFalse();
  });

  it('should be valid when all required fields are correctly filled', () => {
    component.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT)?.setValue(100000);
    component.loanForm.get(FORM_CONTROLS.INTEREST_RATE)?.setValue(5);
    component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT)?.setValue(2);
    component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION)?.setValue(10);
    expect(component.loanForm.valid).toBeTrue();
  });

  describe('Form field validation', () => {
    it('should loanAmountControl be required', () => {
      const control = component.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT);
      control?.setValue('');
      expect(control?.hasError('required')).toBeTrue();
    });

    it('should loanAmountControl have a minimum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT);
      control?.setValue(VALIDATION_PARAMS.MIN_LOAN_AMOUNT - 1);
      expect(control?.hasError('min')).toBeTrue();
    });

    it('should interestRateControl be required', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_RATE);
      control?.setValue('');
      expect(control?.hasError('required')).toBeTrue();
    });

    it('should interestRateControl have a minimum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_RATE);
      control?.setValue(VALIDATION_PARAMS.MIN_INTEREST_RATE - 1);
      expect(control?.hasError('min')).toBeTrue();
    });

    it('should interestRateControl have a maximum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_RATE);
      control?.setValue(VALIDATION_PARAMS.MAX_PERCENTAGE + 1);
      expect(control?.hasError('max')).toBeTrue();
    });

    it('should initialRepaymentControl be required', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT);
      control?.setValue('');
      expect(control?.hasError('required')).toBeTrue();
    });

    it('should initialRepaymentControl be greater than zero', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT);
      control?.setValue(0);
      expect(control?.hasError('greaterThanZero')).toBeTrue();
    });

    it('should initialRepaymentControl have a maximum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT);
      control?.setValue(VALIDATION_PARAMS.MAX_PERCENTAGE + 1);
      expect(control?.hasError('max')).toBeTrue();
    });

    it('should interestFixationControl be required', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION);
      control?.setValue('');
      expect(control?.hasError('required')).toBeTrue();
    });

    it('should interestFixationControl have a minimum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION);
      control?.setValue(VALIDATION_PARAMS.MIN_FIXATION_YEARS - 1);
      expect(control?.hasError('min')).toBeTrue();
    });

    it('should interestFixationControl have a maximum value', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION);
      control?.setValue(VALIDATION_PARAMS.MAX_FIXATION_YEARS + 1);
      expect(control?.hasError('max')).toBeTrue();
    });

    it('should interestFixationControl be an integer', () => {
      const control = component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION);
      control?.setValue('10.5');
      expect(control?.hasError('pattern')).toBeTrue();
    });
  });

  describe('onSubmit', () => {
    it('should emit loanDataSubmitted with the form data when the form is valid', () => {
      // Arrange
      const loanAmount = 100000;
      const interestRate = 5;
      const initialRepayment = 2;
      const interestFixation = 10;

      component.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT)?.setValue(loanAmount);
      component.loanForm.get(FORM_CONTROLS.INTEREST_RATE)?.setValue(interestRate);
      component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT)?.setValue(initialRepayment);
      component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION)?.setValue(interestFixation);

      let emittedLoanData: LoanData | undefined;
      component.loanDataSubmitted.subscribe((data: LoanData) => {
        emittedLoanData = data;
      });

      // Act
      component.onSubmit();

      // Assert
      expect(emittedLoanData).toBeDefined();
      expect(emittedLoanData?.loanAmount).toBe(loanAmount);
      expect(emittedLoanData?.interestRate).toBe(interestRate);
      expect(emittedLoanData?.initialRepayment).toBe(initialRepayment);
      expect(emittedLoanData?.interestFixation).toBe(interestFixation);
    });

    it('should call markAllAsTouched when the form is invalid', () => {
      // Arrange
      spyOn(component.loanForm, 'markAllAsTouched');

      // Act
      component.onSubmit();

      // Assert
      expect(component.loanForm.markAllAsTouched).toHaveBeenCalled();
    });

    it('should not emit loanDataSubmitted when the form is invalid', () => {
      let emittedLoanData: LoanData | undefined;
      component.loanDataSubmitted.subscribe((data: LoanData) => {
        emittedLoanData = data;
      });

      component.onSubmit();

      expect(emittedLoanData).toBeUndefined();
    });
  });

  describe('Access to form fields', () => {
    it('should loanAmountControl return the loanAmount field value', () => {
      const loanAmountValue = 50000;
      component.loanForm.get(FORM_CONTROLS.LOAN_AMOUNT)?.setValue(loanAmountValue);
      expect(component.loanAmountControl?.value).toEqual(loanAmountValue);
    });

    it('should interestRateControl return the interestRate field value', () => {
      const interestRateValue = 3.5;
      component.loanForm.get(FORM_CONTROLS.INTEREST_RATE)?.setValue(interestRateValue);
      expect(component.interestRateControl?.value).toEqual(interestRateValue);
    });

    it('should initialRepaymentControl return the initialRepayment field value', () => {
      const initialRepaymentValue = 7.2;
      component.loanForm.get(FORM_CONTROLS.INITIAL_REPAYMENT)?.setValue(initialRepaymentValue);
      expect(component.initialRepaymentControl?.value).toEqual(initialRepaymentValue);
    });

    it('should interestFixationControl return the interestFixation field value', () => {
      const interestFixationValue = 15;
      component.loanForm.get(FORM_CONTROLS.INTEREST_FIXATION)?.setValue(interestFixationValue);
      expect(component.interestFixationControl?.value).toEqual(interestFixationValue);
    });
  });
});