import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Calendar, RotateCcw, Search, X } from 'lucide-react';

interface Props {
  initialFrom: string;
  initialTo: string;
  onApply: (from: string, to: string) => void;
  onClear: () => void;
  onClose: () => void;
}

export const DateRangeModal: React.FC<Props> = ({ initialFrom, initialTo, onApply, onClear, onClose }) => {
  const { lang } = useLanguage();
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [error, setError] = useState<string | null>(null);

  const MAX_DAYS = 366;

  const handleApply = () => {
    if (!from || !to) {
      setError(lang === 'es' ? 'Debes seleccionar ambas fechas.' : 'You must select both dates.');
      return;
    }
    if (from > to) {
      setError(lang === 'es' ? 'La fecha "Desde" no puede ser mayor que "Hasta".' : '"From" date cannot be later than "To".');
      return;
    }
    const days = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    if (days > MAX_DAYS) {
      setError(
        lang === 'es'
          ? `El rango no puede superar 1 año (${MAX_DAYS} días).`
          : 'The range cannot exceed 1 year (366 days).'
      );
      return;
    }
    setError(null);
    onApply(from, to);
    onClose();
  };

  const handleClear = () => {
    setError(null);
    onClear();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in duration-205">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-blue-600" />
              <span>{lang === 'es' ? 'Filtrar por rango de fechas' : 'Filter by date range'}</span>
            </h2>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
              {lang === 'es' ? 'El dashboard se mostrará según este período.' : 'The dashboard will reflect this period.'}
            </p>
          </div>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 focus:outline-none">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'es' ? 'Desde' : 'From'}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lang === 'es' ? 'Hasta' : 'To'}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-500 shadow-sm" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <Search className="w-3.5 h-3.5" />
            {lang === 'es' ? 'Aplicar' : 'Apply'}
          </button>
          <button onClick={handleClear}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <RotateCcw className="w-3.5 h-3.5" />
            {lang === 'es' ? 'Limpiar' : 'Clear'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer">
            {lang === 'es' ? 'Cancelar' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
