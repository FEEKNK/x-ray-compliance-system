import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const allForms = await db.select().from(schema.forms);
  let updatedCount = 0;

  for (const form of allForms) {
    let needsUpdate = false;
    const questions = form.questions as any[];
    
    if (!questions || !Array.isArray(questions)) continue;

    const updatedQuestions = questions.map(q => {
      // If it's a date type, we want to ensure autoFillToday is true
      if (q.type === 'date') {
        const currentConfig = q.config || {};
        if (!currentConfig.autoFillToday) {
          needsUpdate = true;
          return {
            ...q,
            config: {
              ...currentConfig,
              autoFillToday: true
            }
          };
        }
      }
      return q;
    });

    if (needsUpdate) {
      await db.update(schema.forms)
        .set({ questions: updatedQuestions })
        .where(eq(schema.forms.id, form.id));
      updatedCount++;
      console.log(`Updated form: ${form.title} (${form.id})`);
    }
  }

  console.log(`Finished checking all forms. Updated ${updatedCount} forms to auto-fill current date.`);
}

main().catch(console.error);
