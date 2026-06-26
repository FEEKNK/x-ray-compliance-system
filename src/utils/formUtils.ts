import type { Submission, DynamicForm } from '../types';

export function getSubmissionFailures(submission: Submission, form?: DynamicForm): string[] {
  if (!form) {
    // Fallback if form is not provided: simple checks for legacy
    const fails: string[] = [];
    Object.entries(submission.data).forEach(([key, value]) => {
      if (value === 'Fail' || value === 'Alert') {
        fails.push(`${key}: ${value}`);
      }
    });
    return fails;
  }

  const failedFields: string[] = [];
  const processedKeys = new Set<string>();

  form.questions.forEach(q => {
    const answer = String(submission.data[q.id] || '');
    const otherAnswer = String(submission.data[`${q.id}_other`] || '');
    const hasOtherNote = otherAnswer.trim().length > 0 && answer === '';

    processedKeys.add(q.id);
    processedKeys.add(`${q.id}_other`);

    let isFailing = false;

    // Check explicit failOptions for Dropdown
    if (q.type === 'select' && q.failOptions && q.failOptions.includes(answer)) {
      isFailing = true;
    }
    // Check custom input alert
    else if (q.alertOnCustomInput && q.allowCustomInput) {
      const isExplicitCustom = answer === 'อื่นๆ' || answer === 'Other';
      const isNotInOptions = !q.options?.includes(answer) && answer !== '';
      
      if (isExplicitCustom || isNotInOptions || hasOtherNote) {
         if (q.type === 'yesno' && !['Pass', 'Fail'].includes(answer) && answer !== '') isFailing = true;
         else if (q.type === 'composite' && !['Normal', 'Alert'].includes(answer) && answer !== '') isFailing = true;
         else if (q.type === 'select' || isExplicitCustom || hasOtherNote) isFailing = true;
      }
    }
    // Generic alertOnFail for yesno/composite/text
    else if (q.alertOnFail) {
      if (q.type === 'yesno' && answer === 'Fail') isFailing = true;
      if (q.type === 'composite' && answer === 'Alert') isFailing = true;
      if (q.type === 'text' && answer.trim().length > 0) isFailing = true;
    }
    // Fallback for legacy forms without explicit config
    else if (!q.alertOnFail && !q.failOptions && !q.alertOnCustomInput) {
      if (answer === 'Fail' || answer === 'Alert') isFailing = true;
    }

    if (isFailing) {
      const detail = otherAnswer ? `${answer} (${otherAnswer})`.trim() : answer;
      failedFields.push(`${q.label}: ${detail || '(ไม่ได้ระบุข้อความ)'}`);
    }
  });

  // Catch any legacy `_other` or unmapped keys that equal 'Fail' or 'Alert'
  Object.entries(submission.data).forEach(([key, value]) => {
    if (!processedKeys.has(key) && (value === 'Fail' || value === 'Alert')) {
       failedFields.push(`${key}: ${value}`);
    }
  });

  return failedFields;
}

export function hasSubmissionFailures(submission: Submission, form?: DynamicForm): boolean {
  return getSubmissionFailures(submission, form).length > 0;
}
