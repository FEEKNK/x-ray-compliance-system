# X-Ray Compliance Digital System (v2.1.0)

## 1. Project Overview (README)
ระบบบริหารจัดการการตรวจเช็คเครื่องมือแพทย์และตารางงานดิจิทัล (X-Ray Compliance & Scheduling System) พัฒนาขึ้นเพื่อเปลี่ยนกระบวนการตรวจสอบความปลอดภัยจากระบบกระดาษสู่ดิจิทัล 100% สำหรับแผนกรังสีวิทยาและภาพถ่ายทางการแพทย์

### Key Features:
- **Digitized Protocols:** แปลงแบบฟอร์มมาตรฐาน 28 รายการ (X-Ray, Ultrasound, CT Scan, Mammogram, etc.) เป็นระบบดิจิทัล
- **Bilingual Interface:** รองรับการใช้งานทั้งภาษาไทยและภาษาอังกฤษ (TH/EN)
- **Manual Monthly Scheduling:** หัวหน้างานสามารถวางแผนมอบหมายเวรและหน้าที่ให้พนักงานรายบุคคลได้ล่วงหน้า
- **Real-time Coverage Monitor:** ระบบติดตามความครบถ้วนของการตรวจเช็คเครื่องมือในแต่ละวัน เพื่อให้มั่นใจว่าเครื่องมือทุกชิ้นได้รับการตรวจสอบครบ 100%
- **Compliance Audit & Alerts:** ระบบตรวจสอบงานค้างและแจ้งเตือนหัวหน้างานทันทีเมื่อพบการละทิ้งหน้าที่
- **Digital Evidence:** รองรับการแนบรูปถ่ายหลักฐานและการลงลายเซ็นดิจิทัลเพื่อความถูกต้องทางกฎหมายและมาตรฐานสากล (JCI)

---

## 2. Core Functions (ฟังก์ชันหลัก)

### สำหรับหัวหน้างาน (Admin):
1.  **Admin Dashboard:** ภาพรวมสถิติความสำเร็จ (Global Compliance), กราฟแนวโน้ม (Velocity Chart) และการประกาศข่าวสารภายใน
2.  **Daily Coverage Tracker:** ตารางสี (Grid) แสดงสถานะเครื่องมือทุกชิ้นแบบ Real-time (ขาว=ว่าง, ส้ม=รอดำเนินการ, เขียว=เสร็จสิ้น)
3.  **Manual Scheduler:** ระบบมอบหมายงานแบบเจาะจงบุคคล วันเวลา และสถานที่ (Location/Room)
4.  **Form Builder:** เครื่องมือสร้างและแก้ไขแบบฟอร์มตรวจเช็คได้ด้วยตัวเอง (CRUD)
5.  **User Management:** ระบบจัดการรายชื่อบุคลากร เพิ่ม/แก้ไข/ลบ พนักงานในแผนก
6.  **Master Logs & Export:** คลังเก็บประวัติการตรวจเช็คทั้งหมด สามารถดูรายละเอียดเชิงลึกและ Export เป็น CSV/Print เป็น PDF ได้

### สำหรับเจ้าหน้าที่ (Staff):
1.  **Duty Dashboard:** หน้าจอรวมงานที่ได้รับมอบหมายประจำวัน พร้อมปุ่มเริ่มงานทันที
2.  **Protocol Library:** หน้าจอ Grid รวมแบบฟอร์มทั้งหมด 28 รายการ สำหรับเข้าถึงได้ทันทีในกรณีฉุกเฉินหรือนอกตารางงาน
3.  **Clinical Form Renderer:** ระบบกรอกข้อมูลที่รองรับทุกประเภท (ข้อความ, ตัวเลข, วันที่, รายการเลือก, Pass/Fail)
4.  **Digital Signature:** ระบบยืนยันความถูกต้องของข้อมูลก่อนส่ง
5.  **Personal History:** ประวัติการส่งฟอร์มย้อนหลังรายบุคคล

---

## 3. Technology Stack (เทคโนโลยีที่ใช้)
- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React, Recharts
- **Backend:** Node.js, Express 5, TypeScript
- **Database:** PostgreSQL (Neon Database) พร้อม Drizzle ORM
- **Security:** JWT Authentication, Bcrypt Password & PIN Hashing

---

## 4. Database & Deployment (การติดตั้งและฐานข้อมูล)
ระบบนี้ถูกออกแบบให้เป็น **Full-Stack Application** ที่รองรับการนำไปติดตั้งใช้งานจริงในโรงพยาบาล (On-Premise / Intranet):
- **Database Flexibility:** ผ่านการใช้ Drizzle ORM ทำให้ระบบไม่ได้ยึดติดกับ Database ใดเป็นพิเศษ สามารถสลับไปใช้ Database ที่โรงพยาบาลมีอยู่แล้วได้ เช่น **PostgreSQL (แนะนำ), MySQL, หรือ SQL Server** โดยการแก้ค่า Configuration เพียงเล็กน้อย
- **Security First:** สามารถติดตั้งและรันบนระบบปิด (Closed Network) ของโรงพยาบาลเพื่อความปลอดภัยของข้อมูลบุคลากรและมาตรฐานสาธารณสุข

---

## 5. Next Steps (แผนการพัฒนาในอนาคต)

1.  **QR Code Integration:** ติดตั้ง QR Code ประจำตัวเครื่องแพทย์ เพื่อให้เจ้าหน้าที่ใช้มือถือสแกนแล้วเปิดแบบฟอร์มได้ทันทีโดยไม่ต้องค้นหา
2.  **Advanced Analytics:** ระบบออกรายงานสรุปรายเดือนแบบอัตโนมัติ (Monthly Compliance Report) แบบละเอียด เพื่อใช้ในการออดิตหรือตรวจสอบมาตรฐานโรงพยาบาล (JCI, HA)
3.  **Integration (HIS):** พัฒนา API สำหรับเชื่อมต่อและดึงข้อมูลพื้นฐานจากระบบสารสนเทศหลักของโรงพยาบาล (Hospital Information System)

---
**Developed by Gemini CLI Agent**
*Current Status: Production Ready Prototype*
