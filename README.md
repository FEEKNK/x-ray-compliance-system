# X-Ray Compliance Digital System (v2.3.0)

## 1. Project Overview (README)
ระบบบริหารจัดการการตรวจเช็คเครื่องมือแพทย์และตารางงานดิจิทัล (X-Ray Compliance & Scheduling System) พัฒนาขึ้นเพื่อเปลี่ยนกระบวนการตรวจสอบความปลอดภัยจากระบบกระดาษสู่ดิจิทัล สำหรับแผนกรังสีวิทยาและภาพถ่ายทางการแพทย์

⚠️ **ประกาศสำคัญ (Important Notice):**
แบบฟอร์มในระบบตอนนี้ **ยังไม่เป็นทางการ (Unofficial)** กรุณาตรวจสอบความถูกต้องก่อนใช้งาน หากต้องการเพิ่มหรือแก้ไขรายการใด ๆ สามารถเข้าไปจัดการได้ด้วยตัวเองผ่านเมนู **"จัดการแบบฟอร์ม"** ในหน้าของ Admin
หากมีข้อสงสัย สอบถามเพิ่มเติม หรือแจ้งปัญหา สามารถติดต่อได้ที่อีเมล: **hanafeepara45@gmail.com**

### Key Features:
- **Dynamic Protocol Builder:** รองรับการสร้างและปรับแต่งแบบฟอร์มตรวจเช็ค (X-Ray, Ultrasound, CT Scan, Mammogram, etc.) ได้อย่างอิสระผ่าน Admin Dashboard
- **Manual Monthly Scheduling:** หัวหน้างานสามารถวางแผนมอบหมายเวรและหน้าที่ให้พนักงานรายบุคคลได้ล่วงหน้า
- **Real-time Coverage Monitor:** ระบบติดตามความครบถ้วนของการตรวจเช็คเครื่องมือในแต่ละวัน เพื่อให้มั่นใจว่าเครื่องมือทุกชิ้นได้รับการตรวจสอบ
- **Compliance Audit & Alerts:** ระบบตรวจสอบงานค้างและสรุปรายงานให้หัวหน้างานทราบสถานะการทำงาน
- **Secure PIN Access:** การเข้าสู่ระบบด้วยรหัส PIN ส่วนตัวสำหรับพนักงานแต่ละคนผ่าน Shared Terminal

---

## 2. Core Functions (ฟังก์ชันหลัก)

### สำหรับหัวหน้างาน (Admin):
1.  **Admin Dashboard:** ภาพรวมสถิติความสำเร็จ (Global Compliance), กราฟแนวโน้ม และการประกาศข่าวสารภายใน
2.  **Daily Coverage Tracker:** ตารางแสดงสถานะเครื่องมือทุกชิ้นแบบ Real-time (รอตรวจ/เสร็จสิ้น)
3.  **Manual Scheduler:** ระบบมอบหมายงานแบบเจาะจงบุคคล วันเวลา และประเภทเวร (เช้า/บ่าย/ดึก)
4.  **Form Builder:** เครื่องมือสร้างและแก้ไขแบบฟอร์มตรวจเช็คได้ด้วยตัวเอง (CRUD) - *ใช้สำหรับแก้ไขแบบฟอร์มที่ยังไม่เป็นทางการในปัจจุบัน*
5.  **Bundle Management:** ระบบจัดกลุ่มแบบฟอร์มให้เข้ากันเป็นชุดงาน (Presets) พร้อมระบบจัดเรียงลำดับแบบลากวาง (Drag & Drop)
6.  **User Management:** ระบบจัดการรายชื่อบุคลากร เพิ่ม/แก้ไข/ลบ พนักงานในแผนก
7.  **Master Logs & Export:** คลังเก็บประวัติการตรวจเช็คทั้งหมด สามารถ Export เพื่อทำรายงานได้

### สำหรับเจ้าหน้าที่ (Staff):
1.  **Duty Dashboard:** หน้าจอรวมงานที่ได้รับมอบหมายประจำวัน พร้อมปุ่มเริ่มงาน
2.  **Protocol Library:** รายการแบบฟอร์มทั้งหมด สำหรับเรียกใช้งานนอกเหนือจากตารางปกติ
3.  **Clinical Form Renderer:** ระบบกรอกข้อมูลที่รองรับข้อความ, ตัวเลข, วันที่, และรายการเลือก (Dropdown/Radio)
4.  **Personal History:** ประวัติการส่งฟอร์มย้อนหลังรายบุคคล

---

## 3. Technology Stack (เทคโนโลยีที่ใช้)
- **Frontend:** React, Vite, Tailwind CSS, Lucide React, Recharts
- **Backend/API:** Node.js, Express, TypeScript (Neon Serverless)
- **Database:** PostgreSQL (Neon Database) พร้อม Drizzle ORM
- **Testing:** Vitest สำหรับ Automated Unit & API Testing
- **Security:** JWT Authentication, PIN Authentication สำหรับเข้าใช้งาน

---

## 4. Setup & Environment Variables (การตั้งค่า .env)
การรันระบบนี้จำเป็นต้องตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables) โดยให้คัดลอกไฟล์ `.env.example` แล้วเปลี่ยนชื่อเป็น `.env` จากนั้นกรอกข้อมูลดังนี้:

1. **`DATABASE_URL`**:
   - **แหล่งที่มา:** ไปที่เว็บไซต์ [Neon.tech](https://neon.tech/) สมัครสมาชิกและสร้าง Project ใหม่
   - **วิธีเอาค่า:** ไปที่ Dashboard ของโปรเจกต์ ดูที่ส่วน *Connection Details* จะเห็น URL ที่ขึ้นต้นด้วย `postgres://...` ให้คัดลอกมาใส่

2. **`GMAIL_USER`**:
   - **แหล่งที่มา:** บัญชี Gmail ของคุณ (เช่น `hospital.xray@gmail.com`) ที่จะให้ระบบใช้เป็นตัวส่งอีเมลแจ้งเตือน

3. **`GMAIL_APP_PASSWORD`**:
   - **แหล่งที่มา:** รหัสผ่านสำหรับแอป (App Passwords) จำนวน 16 หลักจาก Google (ไม่ใช่รหัสผ่านเข้าอีเมลปกติ)
   - **วิธีเอาค่า:** เข้าบัญชี Google > Security (ความปลอดภัย) > เปิดใช้งาน 2-Step Verification ให้เรียบร้อย > ค้นหาเมนู "App passwords" > ตั้งชื่อแอป (เช่น XRayCheck) จากนั้นก็อปปี้รหัส 16 หลักมาใส่โดยไม่ต้องเว้นวรรค

4. **`SUPERVISOR_EMAIL`**:
   - **แหล่งที่มา:** ใส่อีเมลของหัวหน้างาน หรือผู้ดูแลระบบ ที่ต้องการให้รับแจ้งเตือนเมื่อมีผลการตรวจเช็คที่ "ตกเกณฑ์ (Fail/Alert)"

5. **`APP_URL`**:
   - **แหล่งที่มา:** ลิงก์ URL ปลายทางของแอปพลิเคชัน (ระบบจะใช้ต่อท้ายในอีเมลแจ้งเตือนให้ผู้รับคลิกกลับมายังแอป)
   - **วิธีเอาค่า:** หากทดสอบในเครื่องตัวเองให้ใส่ `http://localhost:5173` หรือหากนำขึ้น Server จริง (Production) ก็ให้ใส่โดเมนเนมของคุณ (เช่น `https://your-app.com`)

---

## 5. Database & Deployment (การติดตั้งและฐานข้อมูล)
ระบบนี้ถูกออกแบบให้เป็น **Full-Stack Application** ที่รองรับการนำไปติดตั้งใช้งานจริงในโรงพยาบาล:
- **Database:** ใช้ **Neon Database (PostgreSQL Serverless)** เพื่อความรวดเร็วและประหยัดทรัพยากร
- **Contact/Support:** หากมีปัญหาการ Deploy หรือการใช้งานฟอร์มต่างๆ ติดต่อ: hanafeepara45@gmail.com

---

## 6. Next Steps (แผนการพัฒนาในอนาคต)
1.  **Official Form Rollout:** ยืนยันความถูกต้องของแบบฟอร์มทั้งหมดและประกาศใช้เป็นทางการ
2.  **Advanced Analytics:** ระบบออกรายงานสรุปรายเดือนแบบอัตโนมัติ (Monthly Compliance Report) แบบละเอียด
3.  **Integration (HIS):** พัฒนา API สำหรับเชื่อมต่อและดึงข้อมูลพื้นฐานจากระบบสารสนเทศหลักของโรงพยาบาล (Hospital Information System)

---
**Status:** Beta / Unofficial Forms (Ready for Admin Customization)
