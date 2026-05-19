import React, { useMemo } from 'react';
import { useApp } from '../../AppContext';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Thermometer, Droplets, Calendar } from 'lucide-react';
import { translations } from '../../i18n';

interface GroupedData {
  [date: string]: {
    date: string;
    temp: number[];
    humidity: number[];
  };
}

const MonthlyDashboard: React.FC = () => {
  const { submissions, forms, language } = useApp();
  const t = translations[language];

  const chartData = useMemo(() => {
    // Filter for environmental forms (Temp/Humidity)
    const envForms = forms.filter(f => f.title.includes('อุณหภูมิ') || f.title.includes('ความชื้น'));
    const envFormIds = envForms.map(f => f.id);

    const envSubmissions = submissions.filter(s => envFormIds.includes(s.formId));

    // Group by date
    const grouped = envSubmissions.reduce((acc: GroupedData, sub) => {
      const date = sub.submittedAt.split('T')[0];
      if (!acc[date]) acc[date] = { date, temp: [], humidity: [] };

      const tValue = parseFloat(sub.data['q3'] as string);
      const hValue = parseFloat((sub.data['q5'] || sub.data['q6']) as string);

      if (!isNaN(tValue)) acc[date].temp.push(tValue);
      if (!isNaN(hValue)) acc[date].humidity.push(hValue);

      return acc;
    }, {});

    return Object.values(grouped).map((day) => ({
      date: day.date,
      avgTemp: day.temp.length > 0 ? (day.temp.reduce((a, b) => a + b, 0) / day.temp.length).toFixed(1) : null,
      avgHumidity: day.humidity.length > 0 ? (day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length).toFixed(1) : null,
    })).sort((a, b) => a.date.localeCompare(b.date));
  }, [submissions, forms]);

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-800">{t.monthlyPerformance}</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">{t.environmentalCompliance}</p>
        </div>
        <div className="bg-blue-50 text-[#00468B] px-4 py-2 rounded-2xl flex items-center space-x-2">
           <Calendar size={18} />
           <span className="text-sm font-black uppercase tracking-widest">May 2026</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Temperature Chart */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                <Thermometer size={20} />
              </div>
              <span className="font-bold text-gray-700">{t.temperatureLog}</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[15, 30]} unit="°" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <ReferenceLine y={18} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={24} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="avgTemp" 
                  stroke="#f97316" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#f97316', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Temperature"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Humidity Chart */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                <Droplets size={20} />
              </div>
              <span className="font-bold text-gray-700">{t.humidityLog}</span>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" hide />
                <YAxis domain={[30, 80]} unit="%" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <ReferenceLine y={45} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Min', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={65} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'right', value: 'Max', fill: '#ef4444', fontSize: 10 }} />
                <Line 
                  type="monotone" 
                  dataKey="avgHumidity" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  name="Humidity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyDashboard;