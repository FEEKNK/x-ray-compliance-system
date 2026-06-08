import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_SgWO5rXlKkh3@ep-cold-darkness-aoxvjqf5.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

const FORM_ID = '839b4238-60d1-41ba-8271-1b2676e6e4a6';

// ดู submissions วันที่ 7 (2026-06-07)
console.log('=== SUBMISSIONS วันที่ 7 (2026-06-07) สำหรับฟอร์มห้องเก็บยา MRI ===');
const subs = await sql`
  SELECT 
    id,
    submitted_at,
    staff_id,
    schedule_id,
    data->>'q1' as form_date,
    data->>'q2' as temp,
    data->>'q6' as recorder_name,
    data
  FROM submissions 
  WHERE form_id = ${FORM_ID}
  AND (data->>'q1' = '2026-06-07' OR submitted_at::date = '2026-06-07')
  ORDER BY submitted_at ASC
`;
console.log(`พบ ${subs.length} รายการสำหรับวันที่ 7:`);
subs.forEach((s, i) => {
  console.log(`\n--- รายการที่ ${i+1} ---`);
  console.log(`  ID: ${s.id}`);
  console.log(`  submitted_at: ${s.submitted_at}`);
  console.log(`  form_date (q1): ${s.form_date}`);
  console.log(`  อุณหภูมิ (q2): ${s.temp} °C`);
  console.log(`  ผู้บันทึก (q6): ${s.recorder_name}`);
  console.log(`  schedule_id: ${s.schedule_id}`);
  console.log(`  staff_id: ${s.staff_id}`);
});

// ดูว่ามีการ duplicate ในการ assign schedule ไหม
console.log('\n=== ALL SCHEDULES FOR THIS FORM ===');
const scheds = await sql`
  SELECT * FROM schedules WHERE form_id = ${FORM_ID} ORDER BY date ASC
`;
console.log(JSON.stringify(scheds, null, 2));
