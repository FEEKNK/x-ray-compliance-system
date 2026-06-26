import { db } from '../server/db/index';
import * as schema from '../server/db/schema';
import crypto from 'crypto';

async function main() {
  const formId = crypto.randomUUID();
  
  const questions = [
    { id: crypto.randomUUID(), type: "date", label: "วันที่ตรวจสอบ", required: true, config: { autoFillToday: true } },
    { id: crypto.randomUUID(), type: "number", label: "1. CD (เป้าหมาย: 30)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "2. DVD (เป้าหมาย: 20)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "3. ซองใส่ CD, DVD (เป้าหมาย: 50)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "4. บัตรคิว Check up (เป้าหมาย: 20)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "5. บัตรคิว ผู้ป่วย (เป้าหมาย: 10)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "6. ปากกาน้ำเงิน (เป้าหมาย: 2)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "7. ปากกาแดง (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "8. ปากกาเมจิก (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "9. ปากกาเขียน CD (เป้าหมาย: 2)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "10. ลูกแม็คเล็ก (กล่อง) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "11. ลูกแม็คใหญ่ (กล่อง) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "12. กระดาษ A4 (รีม) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "13. ขีดเส้นสมุดรับ CD (Thai)(หน้า) (เป้าหมาย: 3)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "14. ขีดเส้นสมุดรับ CD (Eng)(หน้า) (เป้าหมาย: 3)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "15. กุญแจล็อคเกอร์หญิง (เป้าหมาย: 12)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "16. กุญแจล็อคเกอร์ชาย (เป้าหมาย: 12)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "17. Glove size S (กล่อง) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "18. Glove size M (กล่อง) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "19. หลอด (เป้าหมาย: 10)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "20. น้ำ (แพ็ค) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "21. ธงหนีบไฟสีแดง (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "22. กระดิ่ง (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "23. กระดาษทิชชู (กล่อง) (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "24. Posequad (เป้าหมาย: 1)", required: true },
    { id: crypto.randomUUID(), type: "number", label: "25. Alcohol Hand Gel (เป้าหมาย: 2)", required: true },
  ];

  await db.insert(schema.forms).values({
    id: formId,
    title: "ใบตรวจเช็คจำนวนยาและเวชภัณฑ์ สำหรับเคาน์เตอร์",
    description: "BANGKOK HOSPITAL SIRIROJ - Imaging Department",
    questions: questions,
    isActive: true,
    shifts: ["Morning", "Afternoon", "Night"],
    department: "IMAGING"
  });

  console.log(`Successfully added form: ใบตรวจเช็คจำนวนยาและเวชภัณฑ์ สำหรับเคาน์เตอร์ with ID: ${formId}`);
}

main().catch(console.error);
