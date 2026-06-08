import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_SgWO5rXlKkh3@ep-cold-darkness-aoxvjqf5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

const checkForm = async () => {
  try {
    const forms = await sql`
      SELECT id, title, questions 
      FROM forms 
      WHERE title ILIKE ${'%อุปกรณ์ที่ใช้ในศูนย์ MRI%'} 
      LIMIT 1
    `;
    
    if (forms.length === 0) {
      console.log('Form not found.');
      return;
    }
    
    const form = forms[0];
    console.log(`=== Form Found: ${form.title} (ID: ${form.id}) ===`);
    
    // The `questions` column should contain the JSON array of questions
    const questions = form.questions;
    if (Array.isArray(questions)) {
      console.log(`\nTotal questions: ${questions.length}`);
      
      // Look for the section "4.รถเตรียมยา" or questions starting with 4.
      const section4Questions = questions.filter(q => 
        (q.label && q.label.includes('4.')) || 
        (q.section && q.section.includes('4.')) ||
        (q.label && q.label.includes('รถเตรียมยา'))
      );
      
      console.log('\n--- Section 4 Questions ---');
      section4Questions.forEach(q => {
        console.log(JSON.stringify(q, null, 2));
      });
      
      console.log('\n--- ALL Questions (Summary) ---');
      questions.forEach(q => {
         console.log(`- [${q.id}] ${q.label} (Type: ${q.type})`);
      });

    } else {
      console.log('Questions column is not an array or missing.');
    }
    
  } catch(e) {
    console.log('Error:', e.message);
  }
};

checkForm();
