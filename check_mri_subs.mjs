import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_SgWO5rXlKkh3@ep-cold-darkness-aoxvjqf5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

const checkFormSubs = async () => {
  try {
    const FORM_ID = '329df85b-72b2-4507-9fd9-7a2896d76c79';
    console.log('\n=== Recent Submissions for this Form ===');
    const subs = await sql`
      SELECT id, submitted_at, data
      FROM submissions 
      WHERE form_id = ${FORM_ID}
      ORDER BY submitted_at DESC
      LIMIT 10
    `;
    
    if (subs.length === 0) {
      console.log('No submissions found.');
    } else {
      subs.forEach((s, i) => {
        console.log(`\nSubmission ${i+1} (${s.submitted_at}):`);
        console.log(JSON.stringify(s.data, null, 2));
      });
    }
  } catch(e) {
    console.log('Error:', e.message);
  }
};

checkFormSubs();
