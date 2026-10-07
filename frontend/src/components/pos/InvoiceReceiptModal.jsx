import React, { useEffect, useRef } from 'react';
import { Printer, Download, Plus, CheckCircle, Car } from 'lucide-react';
import Modal from '../common/Modal';
import JsBarcode from 'jsbarcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const InvoiceReceiptModal = ({
  isOpen,
  onClose,
  invoiceData,
  onNewSale
}) => {
  const barcodeRef = useRef(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (isOpen && invoiceData?.invoice_number && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, invoiceData.invoice_number, {
          format: 'CODE128',
          width: 1.5,
          height: 38,
          displayValue: true,
          fontSize: 10,
          font: 'monospace',
          lineColor: '#000000',
          background: '#ffffff'
        });
      } catch (e) {
        console.error('Barcode render error:', e);
      }
    }
  }, [isOpen, invoiceData]);

  if (!invoiceData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`Invoice_${invoiceData.invoice_number}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
    }
  };

  const settings = invoiceData.settings || {};
  const showroomName = settings.showroom_name || 'VIP CAR DECOR';
  const showroomAddress = settings.showroom_address || '104 Boulevard Avenue, Chennai - 600001';
  const showroomPhone = settings.showroom_phone || '+91 98765 43210';
  const gstNumber = settings.gst_number || '33ABCDE1234F1Z5';
  const footerText = settings.invoice_footer || 'Thank you for shopping with us! Goods once sold can be exchanged within 7 days with barcode tags intact.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sale Invoice & Receipt"
      subtitle={`Invoice #${invoiceData.invoice_number}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Printable Receipt Container (Black and White for crisp thermal/A4 print) */}
        <div
          ref={receiptRef}
          id="printable-receipt"
          className="bg-white text-black p-6 rounded-2xl shadow-xl border border-slate-200 font-sans text-xs space-y-4"
        >
          {/* Receipt Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 space-y-1">
            <h2 className="text-base font-black tracking-wider text-black uppercase">{showroomName}</h2>
            <p className="text-[11px] text-slate-700 max-w-sm mx-auto leading-tight">{showroomAddress}</p>
            <p className="text-[11px] text-slate-700 font-medium">Phone: {showroomPhone}</p>
            <p className="text-[11px] font-bold text-slate-900">GSTIN: {gstNumber}</p>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] py-1 border-b border-dashed border-slate-300">
            <div>
              <p><strong className="text-slate-800">Invoice:</strong> <span className="font-mono font-bold text-black">{invoiceData.invoice_number}</span></p>
              <p><strong className="text-slate-800">Date:</strong> {invoiceData.sale_date || new Date().toISOString().slice(0, 10)}</p>
              <p><strong className="text-slate-800">Cashier:</strong> {invoiceData.cashier_name || 'Staff'}</p>
            </div>
            <div className="text-right">
              <p><strong className="text-slate-800">Customer:</strong> {invoiceData.customer_name || 'Walk-in Customer'}</p>
              {invoiceData.customer_phone && <p><strong className="text-slate-800">Phone:</strong> {invoiceData.customer_phone}</p>}
              <p><strong className="text-slate-800">Payment:</strong> <span className="font-bold uppercase text-blue-800">{invoiceData.payment_method}</span></p>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                  <th className="py-1">Item / Barcode</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Rate</th>
                  <th className="py-1 text-right">Disc</th>
                  <th className="py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(invoiceData.items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5 pr-2">
                      <div className="font-bold text-black">{item.product_name}</div>
                      <div className="text-[9px] font-mono text-slate-600">{item.barcode} | {item.sku}</div>
                    </td>
                    <td className="py-1.5 text-center font-mono font-semibold text-black">1</td>
                    <td className="py-1.5 text-right font-mono text-black">₹{parseFloat(item.price || item.unit_selling_price || 0).toFixed(2)}</td>
                    <td className="py-1.5 text-right font-mono text-slate-600">
                      {parseFloat(item.discount_amount || 0) > 0 ? `-₹${parseFloat(item.discount_amount).toFixed(2)}` : '-'}
                    </td>
                    <td className="py-1.5 text-right font-mono font-bold text-black">
                      ₹{parseFloat(item.line_total || item.price || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-700">
              <span>Subtotal:</span>
              <span className="font-mono">₹{parseFloat(invoiceData.subtotal || invoiceData.grand_total || 0).toFixed(2)}</span>
            </div>
            {parseFloat(invoiceData.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-blue-700 font-semibold">
                <span>Discount:</span>
                <span className="font-mono">-₹{parseFloat(invoiceData.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {parseFloat(invoiceData.tax_amount || 0) > 0 && (
              <div className="flex justify-between text-slate-700">
                <span>GST Tax:</span>
                <span className="font-mono">₹{parseFloat(invoiceData.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-black pt-1 border-t border-slate-300">
              <span>GRAND TOTAL:</span>
              <span className="font-mono text-base text-blue-900 font-extrabold">₹{parseFloat(invoiceData.grand_total || 0).toFixed(2)}</span>
            </div>

            {invoiceData.payment_method === 'CASH' && (
              <div className="pt-1 text-[10px] text-slate-700 space-y-0.5">
                <div className="flex justify-between">
                  <span>Cash Received:</span>
                  <span className="font-mono font-semibold">₹{parseFloat(invoiceData.amount_received || invoiceData.grand_total).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-black">
                  <span>Change Returned:</span>
                  <span className="font-mono text-blue-900">₹{parseFloat(invoiceData.change_returned || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Barcode & Footer */}
          <div className="pt-3 border-t border-dashed border-slate-300 text-center space-y-2">
            <svg ref={barcodeRef} className="mx-auto" />
            <p className="text-[9px] text-slate-600 max-w-sm mx-auto leading-normal">{footerText}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New Sale (F2)</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 border border-blue-400/30 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceReceiptModal;
