import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useForms, useSubmissions, useSchedules, useUsers } from '../../hooks/queries';
import { useApp } from '../../AppContext';
import { parseDbDate } from '../../utils/shiftTime';
import {
  ShieldCheck, ChevronLeft, ChevronRight, Calendar,
  FileText, CheckCircle2, AlertTriangle, BarChart3,
  Settings2, ChevronDown, ChevronUp, Download,
  Plus, X, Eye, EyeOff, Search, LayoutList, Grid,
  FileSpreadsheet, FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../assets/logo.svg';
import { SarabunRegular, SarabunBold } from '../../assets/fonts';

// ─── Types ──────────────────────────────────────────
interface ColumnDef {
  id: string;
  label: string;
  visible: boolean;
  isCustom?: boolean;
  width?: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'index', label: '#', visible: true, width: '50px' },
  { id: 'title', label: 'ชื่อแบบฟอร์ม', visible: true, width: '280px' },
  { id: 'department', label: 'แผนก', visible: true, width: '100px' },
  { id: 'status', label: 'สถานะ', visible: true, width: '130px' },
  { id: 'submitCount', label: 'จำนวน Submit', visible: true, width: '120px' },
  { id: 'failCount', label: 'Fail/Alert', visible: true, width: '110px' },
  { id: 'lastSubmit', label: 'ส่งล่าสุด', visible: true, width: '140px' },
];

const LS_KEY = 'quality-dashboard-columns';

function loadColumns(): ColumnDef[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnDef[];
      // Merge with defaults to pick up any new default columns
      const merged = DEFAULT_COLUMNS.map(dc => {
        const saved = parsed.find(p => p.id === dc.id);
        return saved ? { ...dc, visible: saved.visible } : dc;
      });
      // Append custom columns that were added by user
      const custom = parsed.filter(p => p.isCustom);
      return [...merged, ...custom];
    }
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS.map(c => ({ ...c }));
}

function saveColumns(cols: ColumnDef[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(cols));
}

// ─── Component ──────────────────────────────────────
const QualityDashboard: React.FC = () => {
  const { language, settings } = useApp();
  const { data: users = [] } = useUsers();
  const { data: forms = [] } = useForms();
  const { data: schedules = [] } = useSchedules();
  const { data: submissionsData } = useSubmissions();
  const submissions = useMemo(() => submissionsData?.data || [], [submissionsData]);

  // State
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [columns, setColumns] = useState<ColumnDef[]>(loadColumns);
  const [showColMenu, setShowColMenu] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  const [searchTerm, setSearchTerm] = useState('');
  const colMenuRef = useRef<HTMLDivElement>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const selectedMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Close column menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colMenuRef.current && !colMenuRef.current.contains(e.target as Node)) {
        setShowColMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Persist columns
  useEffect(() => { saveColumns(columns); }, [columns]);

  // Navigation
  const handlePrevMonth = () => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() - 1); return d; });
  const handleNextMonth = () => setCurrentDate(prev => { const d = new Date(prev); d.setMonth(d.getMonth() + 1); return d; });
  const monthDisplay = currentDate.toLocaleString(language === 'EN' ? 'en-US' : 'th-TH', { month: 'long', year: 'numeric' });

  // ─── Computed Data ────────────────────────────────
  const availableDepartments = useMemo(() => {
    const depts = new Set<string>();
    forms.forEach(f => {
      if (f.department) depts.add(f.department);
    });
    return ['ALL', ...Array.from(depts)];
  }, [forms]);
  const filteredForms = useMemo(() => {
    let f = forms.filter(fm => fm.isActive);
    if (deptFilter !== 'ALL') f = f.filter(fm => fm.department === deptFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(fm => fm.title.toLowerCase().includes(q));
    }
    return f;
  }, [forms, deptFilter, searchTerm]);

  const formStats = useMemo(() => {
    return filteredForms.map(form => {
      const monthSubs = submissions.filter(s =>
        s.formId === form.id && s.submittedAt.startsWith(selectedMonthStr)
      );
      const failCount = monthSubs.filter(s =>
        Object.values(s.data).some(v => v === 'Fail' || v === 'Alert')
      ).length;
      const lastSub = monthSubs.length > 0
        ? monthSubs.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0].submittedAt
        : null;

      // Calculate expected submissions for the month
      const monthSchedules = schedules.filter(s =>
        s.formId === form.id && s.date.startsWith(selectedMonthStr)
      );
      const completedSchedules = monthSchedules.filter(s => s.status === 'Completed').length;
      const totalSchedules = monthSchedules.length;

      let status: 'complete' | 'partial' | 'none' | 'unassigned';
      if (totalSchedules === 0) {
        status = monthSubs.length > 0 ? 'complete' : 'unassigned';
      } else if (completedSchedules === totalSchedules) {
        status = 'complete';
      } else if (completedSchedules > 0) {
        status = 'partial';
      } else {
        status = 'none';
      }

      return {
        id: form.id,
        title: form.title,
        department: form.department || '—',
        shifts: (form.shifts || []) as string[],
        status,
        submitCount: monthSubs.length,
        failCount,
        lastSubmit: lastSub,
        totalSchedules,
        completedSchedules,
      };
    });
  }, [filteredForms, submissions, schedules, selectedMonthStr]);

  // Summary stats
  const totalForms = formStats.length;
  const completeForms = formStats.filter(f => f.status === 'complete').length;
  const incompleteForms = formStats.filter(f => f.status === 'none' || f.status === 'partial').length;
  const overallRate = totalForms > 0 ? Math.round((completeForms / totalForms) * 100) : 0;

  // ─── Column Handlers ─────────────────────────────
  const toggleColumn = (id: string) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c));
  };

  const addCustomColumn = () => {
    if (!newColName.trim()) return;
    const id = `custom_${Date.now()}`;
    setColumns(prev => [...prev, { id, label: newColName.trim(), visible: true, isCustom: true, width: '140px' }]);
    setNewColName('');
  };

  const removeCustomColumn = (id: string) => {
    setColumns(prev => prev.filter(c => c.id !== id));
  };

  const visibleColumns = columns.filter(c => c.visible);

  // ─── Export Excel ─────────────────────────────────
  const handleExport = () => {
    const rows = formStats.map((f, i) => {
      const base: Record<string, unknown> = {};
      visibleColumns.forEach(col => {
        switch (col.id) {
          case 'index': base[col.label] = i + 1; break;
          case 'title': base[col.label] = f.title; break;
          case 'department': base[col.label] = f.department; break;
          case 'shifts': base[col.label] = f.shifts.join(', ') || '—'; break;
          case 'status':
            base[col.label] = f.status === 'complete' ? 'ครบ' : f.status === 'partial' ? 'บางส่วน' : f.status === 'none' ? 'ยังไม่ส่ง' : 'ไม่ได้กำหนด';
            break;
          case 'submitCount': base[col.label] = f.submitCount; break;
          case 'failCount': base[col.label] = f.failCount; break;
          case 'lastSubmit': base[col.label] = f.lastSubmit ? new Date(f.lastSubmit).toLocaleDateString('th-TH') : '—'; break;
          default:
            if (col.isCustom) base[col.label] = '';
            break;
        }
      });
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quality Dashboard');
    XLSX.writeFile(wb, `Quality_Dashboard_${selectedMonthStr}.xlsx`);
  };

  // ─── SVG to Data URL helper ────────────────────────
  const svgToDataUrl = (svgPath: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeout = setTimeout(() => resolve(''), 2000);
      img.onload = () => {
        clearTimeout(timeout);
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 300;
        canvas.height = img.naturalHeight || 100;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve('');
      };
      img.src = svgPath;
    });
  };

  // ─── Export Single Form as Excel ──────────────────
  const exportSingleFormExcel = (formId: string) => {
    try {
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      const detailSubs = getFormSubmissions(formId);
      const questions = form.questions.filter(q => q.type !== 'date');

      // Build matrix: rows = questions, cols = days
      const rows: Record<string, unknown>[] = [];

      // Header info row
      rows.push({ 'รายการตรวจเช็ค': `${settings.hospitalName} — ${form.title}` });
      rows.push({ 'รายการตรวจเช็ค': `แผนก: ${form.department || '—'}  |  เดือน: ${monthDisplay}` });
      rows.push({});

      // Header row with days
      const headerRow: Record<string, unknown> = { 'รายการตรวจเช็ค': 'รายการตรวจเช็ค' };
      daysArray.forEach(day => { headerRow[String(day)] = day; });
      rows.push(headerRow);

      // Data rows
      questions.forEach(q => {
        const row: Record<string, unknown> = { 'รายการตรวจเช็ค': q.label };
        daysArray.forEach(day => {
          const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
          if (subsOnDay.length > 0) {
            const values = subsOnDay.map(sub => {
              const rawVal = sub.data[q.id];
              const otherVal = sub.data[`${q.id}_other`];
              const val = (rawVal === 'อื่นๆ' && otherVal) ? otherVal : rawVal;
              if (val === 'Pass' || val === 'yes' || val === true) return '✓';
              if (val === 'Fail' || val === 'Alert' || val === 'no' || val === false) return '✗';
              if (val === undefined || val === null || val === '') return '-';
              return String(val);
            });
            row[String(day)] = values.join(' / ');
          } else {
            row[String(day)] = '';
          }
        });
        rows.push(row);
      });

      // Signature row
      const sigRow: Record<string, unknown> = { 'รายการตรวจเช็ค': 'ผู้ตรวจสอบ' };
      const timeRow: Record<string, unknown> = { 'รายการตรวจเช็ค': 'เวลา' };
      daysArray.forEach(day => {
        const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
        sigRow[String(day)] = subsOnDay.map(s => s.staffName.split(' ')[0]).join(', ');
        timeRow[String(day)] = subsOnDay.map(s => {
          const dt = parseDbDate(s.submittedAt);
          return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        }).join(', ');
      });
      rows.push(sigRow);
      rows.push(timeRow);

      if (form.description) {
        rows.push({});
        rows.push({ 'รายการตรวจเช็ค': form.description });
      }

      const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: true });
      // Set column widths
      ws['!cols'] = [{ wch: 30 }, ...daysArray.map(() => ({ wch: 6 }))];
      const wb = XLSX.utils.book_new();
      const safeTitle = form.title.replace(/[\\/?*[\]:]/g, '-');
      XLSX.utils.book_append_sheet(wb, ws, safeTitle.substring(0, 31));
      XLSX.writeFile(wb, `${safeTitle}_${selectedMonthStr}.xlsx`);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('เกิดข้อผิดพลาดในการดาวน์โหลด Excel');
    }
  };

  // ─── Export Single Form as PDF ─────────────────────
  const exportSingleFormPDF = async (formId: string) => {
    try {
      const form = forms.find(f => f.id === formId);
      if (!form) return;
      const detailSubs = getFormSubmissions(formId);
      const questions = form.questions.filter(q => q.type !== 'date');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();

      // Add Thai Fonts
      doc.addFileToVFS('Sarabun-Regular.ttf', SarabunRegular);
      doc.addFont('Sarabun-Regular.ttf', 'Sarabun', 'normal');
      doc.addFileToVFS('Sarabun-Bold.ttf', SarabunBold);
      doc.addFont('Sarabun-Bold.ttf', 'Sarabun', 'bold');

      // Add logo
      try {
        const logoDataUrl = await svgToDataUrl(logo);
        if (logoDataUrl) {
          doc.addImage(logoDataUrl, 'PNG', 10, 6, 40, 14);
        }
      } catch (e) { console.error('Logo render error', e); }

      doc.setFont('Sarabun', 'bold');
      doc.setFontSize(14);
      const hospitalName = settings.hospitalName || 'Hospital';
      doc.text(hospitalName, pageW / 2, 12, { align: 'center' });
      doc.setFontSize(10);
      doc.text(form.title || 'Quality Matrix Form', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(8);
      doc.setFont('Sarabun', 'normal');
      doc.text(`แผนก: ${form.department || '-'}  |  เดือน: ${monthDisplay}`, pageW / 2, 23, { align: 'center' });

      // Draw line under header
      doc.setDrawColor(0, 70, 139); // #00468B
      doc.setLineWidth(0.5);
      doc.line(10, 26, pageW - 10, 26);

      // Build table body
      const head = [['รายการตรวจเช็ค', ...daysArray.map(String)]];
      const body: string[][] = [];

      questions.forEach(q => {
        const row = [q.label];
        daysArray.forEach(day => {
          const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
          if (subsOnDay.length > 0) {
            const vals = subsOnDay.map(sub => {
              const rawVal = sub.data[q.id];
              const otherVal = sub.data[`${q.id}_other`];
              const val = (rawVal === 'อื่นๆ' && otherVal) ? otherVal : rawVal;
              if (val === 'Pass' || val === 'yes' || val === true) return '✓';
              if (val === 'Fail' || val === 'Alert' || val === 'no' || val === false) return '✗';
              if (val === undefined || val === null || val === '') return '-';
              return String(val).substring(0, 4);
            });
            row.push(vals.join('/'));
          } else {
            row.push('');
          }
        });
        body.push(row);
      });

      // Signature row
      const sigRow = ['ผู้ตรวจสอบ'];
      const timeRow = ['เวลา'];
      daysArray.forEach(day => {
        const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
        sigRow.push(subsOnDay.map(s => s.staffName.split(' ')[0].substring(0, 3)).join('/'));
        timeRow.push(subsOnDay.map(s => {
          const dt = parseDbDate(s.submittedAt);
          return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
        }).join('/'));
      });
      body.push(sigRow);
      body.push(timeRow);

      // AutoTable
      autoTable(doc, {
        head,
        body,
        startY: 29,
        theme: 'grid',
        styles: {
          fontSize: 5.5,
          cellPadding: 1,
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.1,
          lineColor: [180, 180, 180],
          font: 'Sarabun',
        },
        headStyles: {
          fillColor: [0, 70, 139],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6,
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 45, fontSize: 6 },
        },
        bodyStyles: {
          minCellHeight: 5,
        },
        didParseCell: (data: import("jspdf-autotable").CellHookData) => {
          // Color coding for Pass/Fail
          if (data.section === 'body' && data.column.index > 0) {
            const text = data.cell.text?.[0] || '';
            if (text === '✓') {
              data.cell.styles.textColor = [22, 163, 74]; // green
              data.cell.styles.fontStyle = 'bold';
            } else if (text === '✗') {
              data.cell.styles.textColor = [220, 38, 38]; // red
              data.cell.styles.fontStyle = 'bold';
            }
          }
          // Highlight signature and time rows
          if (data.section === 'body' && data.row.index >= body.length - 2) {
            data.cell.styles.fillColor = [240, 246, 252];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [0, 70, 139];
          }
        },
        margin: { left: 10, right: 10 },
      });

      // Footer
      const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 180;
      
      let currentY = finalY + 8;
      
      if (form.description) {
        doc.setFontSize(7);
        doc.setTextColor(80);
        const lines = doc.splitTextToSize(form.description, pageW - 20);
        doc.text(lines, 10, currentY);
        currentY += (lines.length * 4) + 2;
      }

      doc.setFontSize(6);
      doc.setTextColor(150);
      doc.text(`Generated: ${new Date().toLocaleString('en-GB', { hour12: false })}  |  ${hospitalName}`, 10, currentY + 5);
      doc.text(`Page 1`, pageW - 15, currentY + 5);

      const safeTitle = form.title.replace(/[\\/?*[\]:]/g, '-');
      doc.save(`${safeTitle}_${selectedMonthStr}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert(`เกิดข้อผิดพลาดในการสร้าง PDF: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // ─── Expanded Row Submissions ─────────────────────
  const getFormSubmissions = (formId: string) => {
    return submissions
      .filter(s => s.formId === formId && s.submittedAt.startsWith(selectedMonthStr))
      .map(s => {
        const staff = users.find(u => u.id === s.staffId);
        const schedule = schedules.find(sch => sch.id === s.scheduleId);
        const hasFail = Object.values(s.data).some(v => v === 'Fail' || v === 'Alert');
        return {
          id: s.id,
          staffName: staff?.name || 'Unknown',
          submittedAt: s.submittedAt,
          shift: schedule?.shift || '—',
          hasFail,
          data: s.data,
        };
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  };

  // ─── Render Cell ──────────────────────────────────
  const renderCell = (col: ColumnDef, stat: typeof formStats[0], index: number) => {
    switch (col.id) {
      case 'index':
        return <span className="text-xs font-black text-gray-400">{index + 1}</span>;
      case 'title':
        return <span className="text-xs font-bold text-gray-800 leading-tight">{stat.title}</span>;
      case 'department':
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
            stat.department === 'MRI' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
          }`}>
            {stat.department}
          </span>
        );

      case 'status':
        if (stat.status === 'complete') {
          return (
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold text-green-700">ครบถ้วน</span>
            </div>
          );
        } else if (stat.status === 'partial') {
          return (
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] font-bold text-amber-700">{stat.completedSchedules}/{stat.totalSchedules}</span>
            </div>
          );
        } else if (stat.status === 'none') {
          return (
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] font-bold text-red-600">ยังไม่ส่ง</span>
            </div>
          );
        }
        return <span className="text-[10px] text-gray-300 font-bold">ไม่ได้กำหนด</span>;
      case 'submitCount':
        return (
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${
            stat.submitCount > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-300'
          }`}>
            {stat.submitCount}
          </span>
        );
      case 'failCount':
        return (
          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black ${
            stat.failCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-300'
          }`}>
            {stat.failCount}
          </span>
        );
      case 'lastSubmit':
        return stat.lastSubmit
          ? <span className="text-[10px] font-bold text-gray-600">{new Date(stat.lastSubmit).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          : <span className="text-gray-300 text-xs">—</span>;
      default:
        // Custom columns — render empty editable placeholder
        return <span className="text-gray-300 text-[10px] italic">—</span>;
    }
  };

  // ─── Status Badge for summary ─────────────────────
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    if (status === 'Pass') return <span className="px-2 py-0.5 rounded-md bg-green-50 text-green-700 text-[9px] font-bold">Pass</span>;
    if (status === 'Fail') return <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[9px] font-bold">Fail</span>;
    if (status === 'Alert') return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[9px] font-bold">Alert</span>;
    return <span className="text-[9px] text-gray-400">{String(status)}</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24 max-w-[100vw] overflow-x-hidden">
      {/* ─── Header ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center space-x-3">
            <ShieldCheck size={28} className="text-[#00468B]" />
            <span>Quality Dashboard</span>
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Form Compliance & Quality Matrix</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาฟอร์ม..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-600 focus:border-[#00468B] outline-none transition-all shadow-sm w-44"
            />
          </div>

          {/* Department filter */}
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto max-w-full">
            {availableDepartments.map(dept => (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  deptFilter === dept
                    ? 'bg-[#00468B] text-white shadow-md'
                    : 'text-gray-400 hover:bg-gray-50'
                }`}
              >
                {dept === 'ALL' ? 'ทั้งหมด' : dept}
              </button>
            ))}
          </div>

          {/* Month navigator */}
          <div className="bg-white border border-gray-200 px-2 py-1.5 rounded-2xl flex items-center shadow-sm">
            <button onClick={handlePrevMonth} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center space-x-2 px-3 min-w-[130px] justify-center">
              <Calendar size={16} className="text-[#00468B]" />
              <span className="text-xs font-black text-[#00468B] uppercase tracking-widest">{monthDisplay}</span>
            </div>
            <button onClick={handleNextMonth} className="p-2 text-gray-400 hover:text-[#00468B] hover:bg-blue-50 rounded-xl transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'ฟอร์มทั้งหมด', value: totalForms, icon: <FileText size={20} />, color: 'blue' },
          { label: 'ครบถ้วน', value: completeForms, icon: <CheckCircle2 size={20} />, color: 'green' },
          { label: 'ยังไม่ครบ', value: incompleteForms, icon: <AlertTriangle size={20} />, color: 'red' },
          { label: 'อัตราครบถ้วน', value: `${overallRate}%`, icon: <BarChart3 size={20} />, color: 'purple' },
        ].map(card => (
          <div key={card.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-transform group-hover:scale-110 ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-600' :
              card.color === 'green' ? 'bg-green-50 text-green-600' :
              card.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-purple-50 text-purple-600'
            }`}>{card.icon}</div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-2xl font-black ${
              card.color === 'blue' ? 'text-blue-700' :
              card.color === 'green' ? 'text-green-700' :
              card.color === 'red' ? 'text-red-600' : 'text-purple-700'
            }`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Quality Matrix Table ────────────────── */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-xl overflow-hidden">
        {/* Table Header Bar */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-white to-blue-50/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00468B]/10 text-[#00468B] flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <span className="font-bold text-gray-700 block">Quality Matrix — ตารางสรุปแบบฟอร์มคุณภาพ</span>
              <span className="text-xs text-gray-400">แสดงสถานะแบบฟอร์มทั้งหมด {totalForms} รายการ ในเดือนที่เลือก</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Column Customizer */}
            <div className="relative" ref={colMenuRef}>
              <button
                onClick={() => setShowColMenu(v => !v)}
                className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border-2 ${
                  showColMenu ? 'bg-[#00468B] text-white border-[#00468B]' : 'bg-white text-gray-500 border-gray-100 hover:border-[#00468B] hover:text-[#00468B]'
                }`}
              >
                <Settings2 size={14} />
                <span>คอลัมน์</span>
              </button>

              {showColMenu && (
                <div className="absolute right-0 top-12 z-50 bg-white rounded-2xl border border-gray-100 shadow-2xl w-72 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">แสดง / ซ่อน คอลัมน์</p>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {columns.map(col => (
                      <div key={col.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors group">
                        <button
                          onClick={() => toggleColumn(col.id)}
                          className="flex items-center space-x-2.5 flex-1"
                        >
                          {col.visible
                            ? <Eye size={14} className="text-[#00468B]" />
                            : <EyeOff size={14} className="text-gray-300" />
                          }
                          <span className={`text-xs font-bold ${col.visible ? 'text-gray-700' : 'text-gray-300'}`}>{col.label}</span>
                        </button>
                        {col.isCustom && (
                          <button
                            onClick={() => removeCustomColumn(col.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">เพิ่มคอลัมน์ใหม่</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newColName}
                        onChange={e => setNewColName(e.target.value)}
                        placeholder="ชื่อคอลัมน์..."
                        className="flex-1 bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-xs font-bold text-gray-600 focus:border-[#00468B] outline-none transition-all"
                        onKeyDown={e => { if (e.key === 'Enter') addCustomColumn(); }}
                      />
                      <button
                        onClick={addCustomColumn}
                        className="w-9 h-9 rounded-xl bg-[#00468B] text-white flex items-center justify-center hover:bg-[#003569] transition-colors shrink-0"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Export Excel</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50/80">
                {visibleColumns.map(col => (
                  <th
                    key={col.id}
                    className="p-4 text-left border-b border-gray-100"
                    style={{ minWidth: col.width }}
                  >
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{col.label}</span>
                  </th>
                ))}
                <th className="p-4 border-b border-gray-100 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {formStats.map((stat, i) => {
                const isExpanded = expandedRow === stat.id;
                const detailSubs = isExpanded ? getFormSubmissions(stat.id) : [];

                return (
                  <React.Fragment key={stat.id}>
                    <tr
                      className={`group transition-all cursor-pointer ${
                        isExpanded ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => setExpandedRow(isExpanded ? null : stat.id)}
                    >
                      {visibleColumns.map(col => (
                        <td key={col.id} className="p-4">
                          {renderCell(col, stat, i)}
                        </td>
                      ))}
                      <td className="p-4">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                          isExpanded ? 'bg-[#00468B] text-white' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-50 group-hover:text-[#00468B]'
                        }`}>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={visibleColumns.length + 1} className="p-0">
                          <div className="bg-gradient-to-b from-blue-50/50 to-white p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00468B]" />
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  รายละเอียดการ Submit ในเดือนนี้ ({detailSubs.length} ครั้ง)
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* View Mode Toggle */}
                                <div className="flex items-center bg-gray-100 p-1 rounded-lg">
                                  <button
                                    onClick={() => setViewMode('matrix')}
                                    className={`p-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'matrix' ? 'bg-white text-[#00468B] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="Matrix View (Paper-like)"
                                  >
                                    <Grid size={14} />
                                  </button>
                                  <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-[#00468B] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                    title="List View"
                                  >
                                    <LayoutList size={14} />
                                  </button>
                                </div>

                                {/* Download Buttons */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); exportSingleFormExcel(stat.id); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-all hover:shadow-sm"
                                    title="Download Excel"
                                  >
                                    <FileSpreadsheet size={12} />
                                    <span>Excel</span>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); exportSingleFormPDF(stat.id); }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all hover:shadow-sm"
                                    title="Download PDF"
                                  >
                                    <FileDown size={12} />
                                    <span>PDF</span>
                                  </button>
                                </div>
                              </div>
                            </div>

                            {detailSubs.length > 0 ? (
                              viewMode === 'list' ? (
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                  <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                      <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">วันที่ส่ง</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ผู้ส่ง</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">เวร</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">ผลลัพธ์</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                      {detailSubs.map(sub => (
                                        <tr key={sub.id} className="hover:bg-gray-50/50">
                                          <td className="px-4 py-3 text-xs font-bold text-gray-700">
                                            {parseDbDate(sub.submittedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })}
                                            <span className="text-gray-400 ml-1">
                                              {parseDbDate(sub.submittedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-xs font-bold text-gray-800">{sub.staffName}</td>
                                          <td className="px-4 py-3">
                                            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">{sub.shift}</span>
                                          </td>
                                          <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                              {Object.entries(sub.data)
                                                .filter(([key]) => key !== 'q1') // Skip date field
                                                .slice(0, 8)
                                                .map(([key, val]) => (
                                                  <StatusBadge key={key} status={String(val)} />
                                                ))}
                                              {Object.keys(sub.data).length > 9 && (
                                                <span className="text-[9px] text-gray-400 font-bold">+{Object.keys(sub.data).length - 9}</span>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="bg-white rounded-2xl border border-gray-100 overflow-x-auto shadow-inner">
                                  <table className="w-full text-sm border-collapse min-w-max">
                                    <thead>
                                      <tr className="bg-gray-100 border-b border-gray-200">
                                        <th className="px-3 py-2 text-left text-[10px] font-black text-gray-500 border-r border-gray-200 sticky left-0 z-20 bg-gray-100 shadow-[1px_0_0_0_#e5e7eb]">
                                          รายการตรวจเช็ค
                                        </th>
                                        {daysArray.map(day => (
                                          <th key={day} className="px-1 py-2 text-center text-[10px] font-black text-gray-500 border-r border-gray-200 w-8 min-w-[32px]">
                                            {day}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {forms.find(f => f.id === stat.id)?.questions.filter(q => q.type !== 'date').map(q => (
                                        <tr key={q.id} className="border-b border-gray-100 hover:bg-gray-50/50 group/row">
                                          <td className="px-3 py-2 text-[10px] font-bold text-gray-700 border-r border-gray-200 sticky left-0 z-10 bg-white group-hover/row:bg-gray-50/50 shadow-[1px_0_0_0_#f3f4f6]">
                                            {q.label}
                                          </td>
                                          {daysArray.map(day => {
                                            const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
                                            return (
                                              <td key={day} className="p-0 border-r border-gray-100 align-top relative bg-white">
                                                {subsOnDay.length > 0 ? (
                                                  <div className="flex flex-col h-full min-h-[28px]">
                                                    {subsOnDay.map((sub, i) => {
                                                      const rawVal = sub.data[q.id];
                                                      const otherVal = sub.data[`${q.id}_other`];
                                                      const val = (rawVal === 'อื่นๆ' && otherVal) ? otherVal : rawVal;
                                                      let display: string;
                                                      let color: string;
                                                      
                                                      if (val === 'Pass' || val === 'yes' || val === true) {
                                                        display = '✓'; color = 'text-green-500 font-black text-xs';
                                                      } else if (val === 'Fail' || val === 'Alert' || val === 'no' || val === false) {
                                                        display = '✗'; color = 'text-red-500 font-black text-xs';
                                                      } else if (val === undefined || val === null || val === '') {
                                                        display = '-'; color = 'text-gray-200';
                                                      } else {
                                                        display = String(val).substring(0, 4);
                                                        color = 'text-[#00468B] font-black text-[9px] tracking-tighter';
                                                      }

                                                      return (
                                                        <div key={i} className={`flex-1 flex items-center justify-center p-0.5 ${i > 0 ? 'border-t border-gray-100' : ''} ${color}`} title={`${sub.staffName} (${sub.shift}): ${val}`}>
                                                          {display}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                ) : (
                                                  <div className="h-full min-h-[28px] bg-gray-50/30"></div>
                                                )}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      ))}
                                      
                                      {/* Staff Signature Row */}
                                      <tr className="bg-blue-50/30">
                                        <td className="px-3 py-2 text-[10px] font-black text-[#00468B] border-r border-gray-200 sticky left-0 z-10 bg-[#f0f6fc] shadow-[1px_0_0_0_#e5e7eb]">
                                          ผู้ตรวจสอบ
                                        </td>
                                        {daysArray.map(day => {
                                          const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
                                          return (
                                            <td key={day} className="p-0 border-r border-gray-100 align-top bg-[#f8fbff]">
                                              {subsOnDay.length > 0 ? (
                                                <div className="flex flex-col h-full min-h-[24px]">
                                                  {subsOnDay.map((sub, i) => (
                                                    <div key={i} className={`flex-1 flex items-center justify-center p-0.5 ${i > 0 ? 'border-t border-blue-100/50' : ''}`} title={`${sub.staffName} (${sub.shift})`}>
                                                      <span className="text-[7px] font-black text-blue-700 truncate max-w-[28px] uppercase">
                                                        {sub.staffName.split(' ')[0].substring(0, 4)}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div className="h-full min-h-[24px]"></div>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                      
                                      {/* Time Row */}
                                      <tr className="bg-blue-50/10 border-t border-gray-100">
                                        <td className="px-3 py-2 text-[10px] font-black text-gray-500 border-r border-gray-200 sticky left-0 z-10 bg-white shadow-[1px_0_0_0_#e5e7eb]">
                                          เวลา
                                        </td>
                                        {daysArray.map(day => {
                                          const subsOnDay = detailSubs.filter(s => parseDbDate(s.submittedAt).getDate() === day);
                                          return (
                                            <td key={day} className="p-0 border-r border-gray-100 align-top bg-white">
                                              {subsOnDay.length > 0 ? (
                                                <div className="flex flex-col h-full min-h-[24px]">
                                                  {subsOnDay.map((sub, i) => {
                                                    const dt = parseDbDate(sub.submittedAt);
                                                    const timeStr = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
                                                    return (
                                                      <div key={i} className={`flex-1 flex items-center justify-center p-0.5 ${i > 0 ? 'border-t border-gray-100' : ''}`} title={`เวลาส่งข้อมูล: ${timeStr}`}>
                                                        <span className="text-[7px] font-bold text-gray-500 tracking-tighter">
                                                          {timeStr}
                                                        </span>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : (
                                                <div className="h-full min-h-[24px]"></div>
                                              )}
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    </tbody>
                                  </table>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-8">
                                <p className="text-xs text-gray-400 font-bold">ไม่มีข้อมูลการ Submit ในเดือนนี้</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {formStats.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="text-center py-16">
                    <div className="flex flex-col items-center space-y-3">
                      <ShieldCheck size={40} className="text-gray-200" />
                      <p className="text-sm text-gray-400 font-bold">ไม่พบแบบฟอร์มที่ตรงกับเงื่อนไข</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            แสดง {formStats.length} จาก {forms.filter(f => f.isActive).length} ฟอร์ม
          </span>
          <div className="flex items-center space-x-4 text-[10px] font-bold text-gray-400">
            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span>ครบถ้วน</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-full bg-amber-400" /><span>บางส่วน</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span>ยังไม่ส่ง</span></div>
            <div className="flex items-center space-x-1.5"><div className="w-2 h-2 rounded-full bg-gray-300" /><span>ไม่ได้กำหนด</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QualityDashboard;
