import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const formId = "3c9d676d-2bda-41aa-a9da-a342223a0879";
  
  const forms = await db.select().from(schema.forms).where(eq(schema.forms.id, formId));
  if (forms.length === 0) {
    console.error("Form not found!");
    return;
  }

  const form = forms[0];
  const questions = form.questions as any[];

  const updatedQuestions = questions.map(q => {
    if (q.type === 'number') {
      return {
        ...q,
        type: 'select',
        options: ['ครบ', 'อื่นๆ'],
        alertOnFail: true,
        failOptions: ['อื่นๆ']
      };
    }
    return q;
  });

  await db.update(schema.forms)
    .set({ questions: updatedQuestions })
    .where(eq(schema.forms.id, formId));

  console.log(`Successfully updated form questions to select 'ครบ' or 'อื่นๆ' with fail alerts.`);
}

main().catch(console.error);
