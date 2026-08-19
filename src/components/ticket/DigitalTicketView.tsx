import React, { useRef, useState } from 'react';
import { Download, Share2, Printer } from 'lucide-react';
import { amountToWords } from './numberToWords';

export interface TicketItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  presentacionNombre?: string;
}

export interface TicketData {
  // Datos empresa / sucursal
  razonSocial: string;
  ruc: string;
  direccion: string;
  telefono: string;
  // Comprobante
  seriePrefijo: string;
  correlativo: number;
  // Venta
  fechaEmision: Date;
  cajeroNombre: string;
  clienteNombre: string;
  clienteDocumento: string;
  items: TicketItem[];
  impuestoPorcentaje: number;
  totalVenta: number;
  pagos: { metodo_pago: string; monto: number }[];
  vuelto: number;
  // Ticket config
  encabezado: string;
  pie: string;
  monedaSimbolo: string;
  incluirQR: boolean;
  ancho: '80mm' | '58mm';
}

interface DigitalTicketViewProps {
  data: TicketData;
  lang: 'es' | 'en';
  onClose: () => void;
}

/** Returns the printable area width based on ticket format */
function getPrintableWidth(ancho: '80mm' | '58mm'): string {
  return ancho === '80mm' ? '72mm' : '48mm';
}

/** Pixel-based max-width for screen rendering */
function getMaxWidthPx(ancho: '80mm' | '58mm'): string {
  return ancho === '80mm' ? '320px' : '220px';
}

function getCurrencyName(symbol: string): string {
  if (symbol === 'S/.' || symbol === 'PEN') return 'SOLES';
  if (symbol === '$' || symbol === 'USD') return 'DÓLARES AMERICANOS';
  if (symbol === '€' || symbol === 'EUR') return 'EUROS';
  if (symbol === 'MXN') return 'PESOS MEXICANOS';
  return 'SOLES';
}

function formatMoney(amount: number, symbol: string): string {
  let s = symbol;
  if (s === 'PEN') s = 'S/.';
  if (s === 'USD') s = '$';
  if (s === 'EUR') s = '€';
  return `${s} ${amount.toFixed(2)}`;
}



function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  let hh = date.getHours();
  const mm = date.getMinutes().toString().padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';
  hh = hh % 12 || 12;
  return `${d}/${m}/${y} ${hh.toString().padStart(2, '0')}:${mm} ${ampm}`;
}

function formatCorrelativo(prefix: string, num: number): string {
  return `${prefix}-${num.toString().padStart(8, '0')}`;
}

export const DigitalTicketView: React.FC<DigitalTicketViewProps> = ({ data, lang, onClose }) => {
  const ticketRef = useRef<HTMLDivElement>(null);

  const {
    razonSocial, ruc, direccion, telefono,
    seriePrefijo, correlativo,
    fechaEmision, cajeroNombre, clienteNombre, clienteDocumento,
    items, impuestoPorcentaje, totalVenta,
    pagos, vuelto,
    encabezado, pie, monedaSimbolo, incluirQR, ancho,
  } = data;

  // Calculate SUNAT breakdown (IGV included in total)
  const baseImponible = impuestoPorcentaje > 0
    ? totalVenta / (1 + impuestoPorcentaje / 100)
    : totalVenta;
  const igvMonto = totalVenta - baseImponible;

  const currencyName = getCurrencyName(monedaSimbolo);
  const maxW = getMaxWidthPx(ancho);
  const is58 = ancho === '58mm';
  const separatorChar = '─';
  const separatorLen = is58 ? 28 : 44;
  const separator = separatorChar.repeat(separatorLen);
  const doubleSep = '═'.repeat(separatorLen);


  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!ticketRef.current || downloadingPDF) return;
    setDownloadingPDF(true);

    const filename = `ticket_${formatCorrelativo(seriePrefijo, correlativo)}.pdf`;
    const is80 = ancho === '80mm';
    const pdfWidthMm = is80 ? 80 : 58;

    const ensureHtml2Pdf = async (): Promise<any> => {
      if ((window as any).html2pdf) {
        return (window as any).html2pdf;
      }
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve((window as any).html2pdf);
        script.onerror = () => reject(new Error('Failed to load html2pdf CDN script'));
        document.head.appendChild(script);
      });
    };

    try {
      const html2pdf = await ensureHtml2Pdf();
      const element = ticketRef.current;

      const elementHeightMm = Math.max(100, Math.ceil(element.offsetHeight * 0.264583) + 8);

      const opt = {
        margin:       [2, 2, 2, 2],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 3, useCORS: true, logging: false, letterRendering: true },
        jsPDF:        { unit: 'mm', format: [pdfWidthMm, elementHeightMm], orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Error generating PDF download:', err);
      handlePrint();
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleShare = async () => {
    const ticketText = [
      razonSocial,
      `RUC: ${ruc}`,
      `TICKET ${formatCorrelativo(seriePrefijo, correlativo)}`,
      `Fecha: ${formatDate(fechaEmision)}`,
      `Cliente: ${clienteNombre}`,
      ``,
      ...items.map(item => `${item.cantidad}x ${item.presentacionNombre ? `${item.nombre} (${item.presentacionNombre})` : item.nombre} - ${formatMoney(item.cantidad * item.precioUnitario, monedaSimbolo)}`),
      ``,
      `TOTAL: ${formatMoney(totalVenta, monedaSimbolo)}`,
      pagos.map(p => `${p.metodo_pago}: ${formatMoney(p.monto, monedaSimbolo)}`).join(', '),
      vuelto > 0 ? `Vuelto: ${formatMoney(vuelto, monedaSimbolo)}` : '',
      '',
      pie || '¡Gracias por su preferencia!',
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Ticket ${formatCorrelativo(seriePrefijo, correlativo)}`,
          text: ticketText,
        });
        return;
      } catch {
        // User cancelled or not supported, fall through to WhatsApp
      }
    }

    // Fallback: open WhatsApp with ticket summary
    const waText = encodeURIComponent(ticketText);
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !ticketRef.current) return;

    const printableWidth = getPrintableWidth(ancho);
    const content = ticketRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Ticket ${formatCorrelativo(seriePrefijo, correlativo)}</title>
        <style>
          @page {
            margin: 0;
            size: ${printableWidth} auto;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: ${printableWidth};
            background-color: #ffffff;
            color: #000000;
            font-family: 'Courier New', Courier, monospace;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          * {
            box-sizing: border-box;
          }
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .flex-1 { flex: 1 1 0% !important; }
          .flex-shrink-0 { flex-shrink: 0 !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          .items-center { align-items: center !important; }
          .items-start { align-items: flex-start !important; }
          .text-center { text-align: center !important; }
          .text-right { text-align: right !important; }
          .text-left { text-align: left !important; }
          .font-bold { font-weight: 700 !important; }
          .font-extrabold { font-weight: 800 !important; }
          .font-black { font-weight: 900 !important; }
          .font-mono { font-family: 'Courier New', Courier, monospace !important; }
          .uppercase { text-transform: uppercase !important; }
          .italic { font-style: italic !important; }
          .truncate { overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
          .space-y-0.5 > * + * { margin-top: 2px !important; }
          .space-y-1 > * + * { margin-top: 4px !important; }
          .space-y-1.5 > * + * { margin-top: 6px !important; }
          .space-y-2 > * + * { margin-top: 8px !important; }
          .py-1 { padding-top: 4px !important; padding-bottom: 4px !important; }
          .py-1.5 { padding-top: 6px !important; padding-bottom: 6px !important; }
          .py-2 { padding-top: 8px !important; padding-bottom: 8px !important; }
          .py-3 { padding-top: 12px !important; padding-bottom: 12px !important; }
          .pb-2 { padding-bottom: 8px !important; }
          .mt-1 { margin-top: 4px !important; }
          .ml-1 { margin-left: 4px !important; }
          .ml-2 { margin-left: 8px !important; }
          .mr-1 { margin-right: 4px !important; }
          .mb-1 { margin-bottom: 4px !important; }
          .w-\[12\%\] { width: 12% !important; }
          .w-\[42\%\] { width: 42% !important; }
          .w-\[22\%\] { width: 22% !important; }
          .w-\[24\%\] { width: 24% !important; }
          .break-words { word-break: break-word !important; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Scrollable Ticket Preview con Safe Area Insets */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] flex justify-center min-h-0">
        <div
          ref={ticketRef}
          style={{ maxWidth: maxW, width: '100%', fontFamily: "'Courier New', Courier, monospace" }}
          className="bg-white p-4 sm:p-5 space-y-0 text-slate-900"
        >
          {/* ── Header: Business Info ── */}
          <div className="text-center space-y-0.5 pb-2">
            <p className="font-extrabold text-[11px] leading-tight tracking-tight uppercase">{razonSocial}</p>
            {ruc && <p className="text-[10px] font-bold">R.U.C. N° {ruc}</p>}
            {direccion && <p className="text-[9px] text-slate-600 leading-tight">{direccion}</p>}
            {telefono && <p className="text-[9px] text-slate-600">Tel: {telefono}</p>}
            {encabezado && <p className="text-[9px] text-slate-500 italic leading-tight mt-1">{encabezado}</p>}
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-400 text-center leading-none select-none">{doubleSep}</p>

          {/* ── Comprobante Type & Serie ── */}
          <div className="text-center py-1.5 space-y-0.5">
            <p className="font-extrabold text-[10px] uppercase tracking-wider">
              {lang === 'es' ? 'TICKET' : 'TICKET'}
            </p>
            <p className="font-bold text-[10px] font-mono tracking-widest">
              {formatCorrelativo(seriePrefijo, correlativo)}
            </p>
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-400 text-center leading-none select-none">{doubleSep}</p>

          {/* ── Sale Meta ── */}
          <div className={`py-1.5 space-y-0.5 ${is58 ? 'text-[8px]' : 'text-[9px]'}`}>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">{lang === 'es' ? 'Emisión' : 'Date'}:</span>
              <span className="font-bold font-mono">{formatDate(fechaEmision)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">{lang === 'es' ? 'Cajero' : 'Cashier'}:</span>
              <span className="font-bold truncate ml-2 text-right">{cajeroNombre}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-semibold">{lang === 'es' ? 'Cliente' : 'Customer'}:</span>
              <span className="font-bold truncate ml-2 text-right">{clienteNombre || (lang === 'es' ? 'Cliente General' : 'Walk-in')}</span>
            </div>
            {clienteDocumento && (
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">{lang === 'es' ? 'Doc.' : 'ID'}:</span>
                <span className="font-bold font-mono">{clienteDocumento}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-400 text-center leading-none select-none">{doubleSep}</p>

          {/* ── Items Table Header ── */}
          <div className={`py-1.5 ${is58 ? 'text-[7px]' : 'text-[8px]'} font-extrabold text-slate-700 uppercase tracking-wider border-y border-slate-300 flex justify-between items-center select-none`}>
            <span className="w-[12%] text-left shrink-0">{lang === 'es' ? 'CANT.' : 'QTY.'}</span>
            <span className="w-[42%] text-left">{lang === 'es' ? 'DESCRIPCIÓN' : 'DESCRIPTION'}</span>
            <span className="w-[22%] text-right shrink-0">{lang === 'es' ? 'P. UNIT' : 'UNIT P.'}</span>
            <span className="w-[24%] text-right shrink-0">{lang === 'es' ? 'TOTAL' : 'TOTAL'}</span>
          </div>

          {/* ── Items Table List ── */}
          <div className="divide-y divide-dashed divide-slate-100 py-1">
            {items.map((item, idx) => {
              const lineTotal = item.cantidad * item.precioUnitario;
              const displayName = item.presentacionNombre
                ? `${item.nombre} (${item.presentacionNombre})`
                : item.nombre;

              return (
                <div key={idx} className={`py-1.5 flex items-start justify-between ${is58 ? 'text-[7.5px]' : 'text-[8.5px]'}`}>
                  <span className="w-[12%] text-left font-bold font-mono shrink-0">{item.cantidad}</span>
                  <span className="w-[42%] text-left font-semibold break-words pr-1 leading-tight">{displayName}</span>
                  <span className="w-[22%] text-right font-mono shrink-0">{item.precioUnitario.toFixed(2)}</span>
                  <span className="w-[24%] text-right font-bold font-mono shrink-0">{lineTotal.toFixed(2)}</span>
                </div>
              );
            })}
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-400 text-center leading-none select-none">{doubleSep}</p>

          {/* ── SUNAT Totals ── */}
          <div className={`py-1.5 space-y-0.5 ${is58 ? 'text-[8px]' : 'text-[9px]'}`}>
            {impuestoPorcentaje > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">{lang === 'es' ? 'Op. Gravada' : 'Taxable'}</span>
                  <span className="font-bold font-mono">{formatMoney(baseImponible, monedaSimbolo)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">I.G.V. ({impuestoPorcentaje.toFixed(2)}%)</span>
                  <span className="font-bold font-mono">{formatMoney(igvMonto, monedaSimbolo)}</span>
                </div>
              </>
            )}
          </div>

          <p className="text-[9px] text-slate-300 text-center leading-none select-none">{separator}</p>

          {/* ── Grand Total ── */}
          <div className={`py-2 flex justify-between items-baseline ${is58 ? 'text-[10px]' : 'text-[12px]'}`}>
            <span className="font-extrabold uppercase tracking-wide">{lang === 'es' ? 'IMPORTE TOTAL' : 'TOTAL'}</span>
            <span className="font-black font-mono">{formatMoney(totalVenta, monedaSimbolo)}</span>
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-400 text-center leading-none select-none">{doubleSep}</p>

          {/* ── Amount in words ── */}
          <div className="py-1.5">
            <p className={`${is58 ? 'text-[7px]' : 'text-[8px]'} font-bold text-slate-600 leading-tight`}>
              {amountToWords(totalVenta, currencyName)}
            </p>
          </div>

          {/* ── Payment Breakdown ── */}
          <div className={`py-1.5 space-y-0.5 ${is58 ? 'text-[8px]' : 'text-[9px]'}`}>
            <p className="font-extrabold text-slate-500 uppercase tracking-wider text-[8px] mb-1">
              {lang === 'es' ? 'DESGLOSE DE PAGO' : 'PAYMENT BREAKDOWN'}
            </p>
            {pagos.map((p, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="capitalize font-semibold">{p.metodo_pago}</span>
                <span className="font-bold font-mono">{formatMoney(p.monto, monedaSimbolo)}</span>
              </div>
            ))}
            {vuelto > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span className="pl-2">{lang === 'es' ? 'Vuelto Entregado' : 'Change Given'}</span>
                <span className="font-mono">{formatMoney(vuelto, monedaSimbolo)}</span>
              </div>
            )}
          </div>

          {/* Separator */}
          <p className="text-[9px] text-slate-300 text-center leading-none select-none">{separator}</p>

          {/* ── QR Placeholder ── */}
          {incluirQR && (
            <div className="py-3 flex flex-col items-center space-y-1">
              <div className={`${is58 ? 'w-14 h-14' : 'w-20 h-20'} border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50`}>
                <span className="text-[8px] text-slate-400 font-bold text-center leading-tight">QR<br />SUNAT</span>
              </div>
              <p className="text-[7px] text-slate-400 font-medium text-center">
                {lang === 'es' ? 'Escanea para verificar' : 'Scan to verify'}
              </p>
            </div>
          )}

          {/* ── Hash / Footer ── */}
          <div className="text-center space-y-1 pt-1">
            {incluirQR && (
              <p className="text-[7px] text-slate-400 font-mono break-all">
                Hash: {Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}
              </p>
            )}
            <p className="text-[8px] text-slate-400 font-semibold">
              {lang === 'es' ? 'Representación impresa del comprobante de pago' : 'Printed representation of payment receipt'}
            </p>
            {pie ? (
              <p className="text-[8px] text-slate-500 font-bold italic">{pie}</p>
            ) : (
              <p className="text-[8px] text-slate-500 font-bold italic">
                {lang === 'es' ? '¡Gracias por su preferencia!' : 'Thank you for your business!'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Action Buttons con Safe Area Insets ── */}
      <div className="bg-slate-50/90 border-t border-slate-200 p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] space-y-2 shrink-0">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            disabled={downloadingPDF}
            onClick={handleDownloadPDF}
            className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {downloadingPDF ? (
              <span className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-blue-600" />
            )}
            <span>{downloadingPDF ? (lang === 'es' ? 'PDF...' : 'PDF...') : (lang === 'es' ? 'Descargar' : 'Download')}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'es' ? 'Compartir' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-purple-600" />
            <span>{lang === 'es' ? 'Imprimir' : 'Print'}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>+</span>
          <span>{lang === 'es' ? 'Nueva Venta' : 'New Sale'}</span>
        </button>
      </div>
    </div>
  );
};
