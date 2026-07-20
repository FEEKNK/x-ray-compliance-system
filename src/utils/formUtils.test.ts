import { describe, it, expect } from 'vitest';
import { getSubmissionFailures, hasSubmissionFailures } from './formUtils';
import type { Submission, DynamicForm } from '../types';

describe('formUtils', () => {
  describe('getSubmissionFailures', () => {
    it('should return empty array if no failures', () => {
      const submission = {
        id: '1',
        data: { q1: 'Pass', q2: 'Normal' },
      } as unknown as Submission;
      
      const form = {
        id: 'f1',
        title: 'Test',
        questions: [
          { id: 'q1', label: 'Q1', type: 'yesno', alertOnFail: true },
          { id: 'q2', label: 'Q2', type: 'composite', alertOnFail: true },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual([]);
    });

    it('should detect yesno failures', () => {
      const submission = {
        data: { q1: 'Fail' },
      } as unknown as Submission;
      
      const form = {
        questions: [
          { id: 'q1', label: 'Q1', type: 'yesno', alertOnFail: true },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual(['Q1: Fail']);
    });

    it('should detect composite failures', () => {
      const submission = {
        data: { q1: 'Alert' },
      } as unknown as Submission;
      
      const form = {
        questions: [
          { id: 'q1', label: 'Q1', type: 'composite', alertOnFail: true },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual(['Q1: Alert']);
    });

    it('should detect text failures when alertOnFail is true', () => {
      const submission = {
        data: { q1: 'Some issue' },
      } as unknown as Submission;
      
      const form = {
        questions: [
          { id: 'q1', label: 'Q1 text', type: 'text', alertOnFail: true },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual(['Q1 text: Some issue']);
    });

    it('should detect dropdown explicitly failed options', () => {
      const submission = {
        data: { q1: 'Bad Option' },
      } as unknown as Submission;
      
      const form = {
        questions: [
          { id: 'q1', label: 'Dropdown', type: 'select', failOptions: ['Bad Option'] },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual(['Dropdown: Bad Option']);
    });

    it('should detect custom input as failure if configured', () => {
      const submission = {
        data: { q1: 'Other', q1_other: 'Custom reason' },
      } as unknown as Submission;
      
      const form = {
        questions: [
          { id: 'q1', label: 'Choice', type: 'select', allowCustomInput: true, alertOnCustomInput: true },
        ],
      } as unknown as DynamicForm;

      const failures = getSubmissionFailures(submission, form);
      expect(failures).toEqual(['Choice: Other (Custom reason)']);
    });

    it('should handle legacy form (no form definition provided)', () => {
      const submission = {
        data: { someKey: 'Fail', otherKey: 'Alert', okKey: 'Pass' },
      } as unknown as Submission;

      const failures = getSubmissionFailures(submission); // form is undefined
      expect(failures).toEqual(expect.arrayContaining(['someKey: Fail', 'otherKey: Alert']));
      expect(failures).toHaveLength(2);
    });
  });

  describe('hasSubmissionFailures', () => {
    it('should return true if failures exist', () => {
      const submission = { data: { q1: 'Fail' } } as unknown as Submission;
      const form = { questions: [{ id: 'q1', label: 'Q1', type: 'yesno', alertOnFail: true }] } as unknown as DynamicForm;
      
      expect(hasSubmissionFailures(submission, form)).toBe(true);
    });

    it('should return false if no failures', () => {
      const submission = { data: { q1: 'Pass' } } as unknown as Submission;
      const form = { questions: [{ id: 'q1', label: 'Q1', type: 'yesno', alertOnFail: true }] } as unknown as DynamicForm;
      
      expect(hasSubmissionFailures(submission, form)).toBe(false);
    });
  });
});
