import React from 'react';

interface GlobalLoaderProps {
  error?: string | null;
  onRetry?: () => void;
}

const GlobalLoader: React.FC<GlobalLoaderProps> = ({ error, onRetry }) => {
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-6 p-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <span className="text-3xl">⚠️</span>
        </div>
        <div className="text-center space-y-3 max-w-md">
          <p className="text-lg font-bold text-red-700">ไม่สามารถเชื่อมต่อ Server ได้</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button 
            onClick={onRetry || (() => window.location.reload())}
            className="mt-4 px-8 py-3 bg-[#00468B] text-white rounded-xl font-bold text-sm hover:bg-[#003569] transition-colors"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-6">
      <div className="w-16 h-16 border-4 border-[#00468B] border-t-transparent rounded-full animate-spin"></div>
      <div className="text-center space-y-2">
        <p className="text-lg font-bold text-gray-700">กำลังโหลดข้อมูล...</p>
        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Connecting to Database</p>
      </div>
    </div>
  );
};

export default GlobalLoader;
