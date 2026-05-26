import React from 'react';
import { BookOpen, ShieldCheck, Zap, ArrowRight, Layout } from 'lucide-react';

const SystemGuide: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-50 text-[#00468B] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
           <BookOpen size={32} />
        </div>
        <h1 className="text-4xl font-black text-gray-800">System Documentation</h1>
        <p className="text-lg text-gray-500 font-medium max-w-2xl mx-auto">
          Everything you need to know about the Imaging Compliance & Scheduling Management System.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <GuideCard 
          icon={<Layout className="text-blue-500" />}
          title="1. Project README"
          description="ระบบบริหารจัดการการตรวจเช็คเครื่องมือแพทย์ดิจิทัล พัฒนาเพื่อเปลี่ยนงานกระดาษสู่ระบบฐานข้อมูล 100% รองรับมาตรฐาน JCI"
        />
        <GuideCard 
          icon={<ShieldCheck className="text-green-500" />}
          title="2. Core Functions"
          description="จัดตารางเวรรายเดือน, ติดตามความครอบคลุมรายวัน, ระบบแจ้งเตือนงานค้าง, ลายเซ็นดิจิทัล และการ Export รายงาน"
        />
        <GuideCard 
          icon={<Zap className="text-amber-500" />}
          title="3. Next Steps"
          description="การติดตั้ง QR Code บนตัวเครื่อง และระบบซิงค์ข้อมูลผ่าน Cloud เพื่อความปลอดภัยสูงสุด"
        />
      </div>

      <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm space-y-10">
         <section className="space-y-6">
            <h3 className="text-xl font-bold text-[#00468B] flex items-center">
               <Zap size={20} className="mr-2" />
               ฟังก์ชันการทำงานที่สำคัญ (Detailed Functions)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <FunctionItem 
                title="Dynamic Form Builder" 
                text="แอดมินสามารถสร้างหรือแก้ไขหัวข้อการตรวจเช็คเครื่องมือทั้ง 28 รายการได้เองทันที"
               />
               <FunctionItem 
                title="Manual Monthly Planning" 
                text="ระบบมอบหมายงานแบบกลุ่ม (Bulk Mode) ช่วยให้จัดตารางงานทั้งเดือนเสร็จในไม่กี่คลิก"
               />
               <FunctionItem 
                title="Daily Coverage Grid" 
                text="หน้าจอ Dashboard ที่คอยเฝ้าดูว่าวันนี้เครื่องมือชิ้นไหนยังไม่ได้ตรวจเช็ค"
               />
               <FunctionItem 
                title="Accountability Suite" 
                text="ระบบบันทึกรูปถ่ายหลักฐาน ลายเซ็นดิจิทัล และประวัติการทำงานรายบุคคล"
               />
            </div>
         </section>

         <section className="space-y-6 border-t border-gray-50 pt-10">
            <h3 className="text-xl font-bold text-[#00468B] flex items-center">
               <ArrowRight size={20} className="mr-2" />
               แผนการพัฒนาต่อยอด (Future Roadmap)
            </h3>
            <ul className="space-y-4">
               <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">1</div>
                  <p className="text-gray-600"><strong>QR Code Access:</strong> ติดสติกเกอร์ที่เครื่อง Imaging เพื่อให้พนักงานสแกนแล้วเข้าสู่ฟอร์มได้ทันที</p>
               </li>
               <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">2</div>
                  <p className="text-gray-600"><strong>Advanced Analytics:</strong> ระบบวิเคราะห์แนวโน้มการชำรุดของเครื่องมือแบบเชิงรุก (Predictive Maintenance)</p>
               </li>
               <li className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">3</div>
                  <p className="text-gray-600"><strong>Auto Reporting:</strong> ระบบส่งรายงานสรุป Compliance รายเดือนเข้าอีเมลผู้บริหารโดยอัตโนมัติ</p>
               </li>
            </ul>
         </section>
      </div>
    </div>
  );
};

const GuideCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
  <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow space-y-4">
    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
      {icon}
    </div>
    <h3 className="font-bold text-gray-800 text-lg">{title}</h3>
    <p className="text-sm text-gray-500 leading-relaxed font-medium">{description}</p>
  </div>
);

const FunctionItem: React.FC<{ title: string, text: string }> = ({ title, text }) => (
  <div className="flex space-x-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
     <div className="mt-1">
        <ShieldCheck size={16} className="text-blue-500" />
     </div>
     <div>
        <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{text}</p>
     </div>
  </div>
);

export default SystemGuide;