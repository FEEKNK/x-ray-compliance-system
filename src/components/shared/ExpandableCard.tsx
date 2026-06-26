import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export const ExpandableCard: React.FC<{
  id: string;
  maximizedId: string | null;
  setMaximizedId: (id: string | null) => void;
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}> = ({ id, maximizedId, setMaximizedId, header, children, className = '', contentClassName = '' }) => {
  const isMaximized = maximizedId === id;

  if (isMaximized) {
    return (
      <div className="fixed inset-0 z-[100] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
        <div className={`bg-white w-full h-full max-w-[1400px] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 relative ${className.replace('animate-in slide-in-from-top-2', '')} border-none`}>
          
          {header ? (
            <div className="relative shrink-0 w-full z-20 shadow-sm bg-white">
              {header}
              <div className="absolute top-1/2 -translate-y-1/2 right-6 z-50">
                <button 
                  onClick={() => setMaximizedId(null)} 
                  className="p-2.5 bg-white backdrop-blur shadow-sm rounded-xl hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900 border border-gray-200"
                >
                  <Minimize2 size={20} />
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute top-6 right-6 z-50">
              <button 
                onClick={() => setMaximizedId(null)} 
                className="p-3 bg-white/90 backdrop-blur shadow-md rounded-xl hover:bg-gray-50 transition-colors text-gray-600 hover:text-gray-900 border border-gray-100"
              >
                <Minimize2 size={24} />
              </button>
            </div>
          )}

          <div className={`flex-1 overflow-y-auto relative ${contentClassName || 'p-8'}`}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative group transition-all duration-300 flex flex-col ${className}`}>
      
      {header ? (
        <div className="relative shrink-0 w-full z-10">
          {header}
          <div className="absolute top-1/2 -translate-y-1/2 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={() => setMaximizedId(id)} 
              className="p-2 bg-white/90 backdrop-blur-sm border border-gray-200 shadow-sm rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-[#00468B]"
              title="ขยายเต็มจอ"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button 
            onClick={() => setMaximizedId(id)} 
            className="p-2 bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm rounded-lg hover:bg-gray-50 transition-colors text-gray-500 hover:text-[#00468B]"
            title="ขยายเต็มจอ"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      )}

      {contentClassName ? (
        <div className={contentClassName}>
          {children}
        </div>
      ) : (
        children
      )}
    </div>
  );
};
