import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { formatCurrency, numberToThaiText } from "../../lib/utils";

// --- Interfaces and Types (ไม่เปลี่ยนแปลง) ---
interface DocumentItem {
  product_id?: string;
  productId?: string;
  unit?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  unit_price?: number;
  amount?: number;
  product_name?: string;
  productTitle?: string;
  discount?: number;
  discount_type?: "thb" | "percentage";
  discountType?: "thb" | "percentage";
}
interface DocumentSummary {
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  withholdingTax: number;
}
interface DocumentBase {
  document_number?: string;
  documentNumber?: string;
  issue_date?: string;
  documentDate?: string;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_tax_id?: string;
  notes?: string;
  items: DocumentItem[];
  summary: DocumentSummary;
  customer?: {
    name?: string;
    tax_id?: string;
    phone?: string;
    address?: string;
  };
  receipt_details?: any;
}
interface Quotation extends DocumentBase {}
interface Invoice extends DocumentBase {}
interface DocumentModalProps {
  type: "quotation" | "invoice" | "receipt";
  document: Quotation | Invoice;
  open: boolean;
  onClose: () => void;
}

// --- Constants (ไม่เปลี่ยนแปลง) ---
const typeLabels = {
  quotation: { title: "ใบเสนอราคา" },
  invoice: { title: "ใบแจ้งหนี้" },
  receipt: { title: "ใบเสร็จรับเงิน" },
};
const SELLER_INFO = {
  company: "บริษัท Tomato Ideas COMPANY LIMITED - UAT จำกัด",
  address:
    "เลขที่ 21 ซอย สุดสงวนท่าไม้ แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพมหานคร 10130",
  taxId: "0155562052664 (สำนักงานใหญ่)",
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// =================================================================
// START: Reusable UI Components
// =================================================================

const DocumentHeaderAndCustomer = ({
  labels,
  document,
}: {
  labels: any;
  document: any;
}) => (
  <div className="avoid-break">
    <div className="flex flex-row justify-between items-start border-b-2 border-blue-200 pb-4 mb-4">
      <div className="flex flex-row items-center gap-3">
        <div className="w-12 h-12 border-2 border-blue-200 rounded-full flex items-center justify-center text-blue-300 text-sm font-bold">
          LOGO
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-blue-900 leading-tight">
            {SELLER_INFO.company}
          </span>
          <span className="text-xs text-gray-600 leading-tight">
            {SELLER_INFO.address}
          </span>
          <span className="text-xs text-gray-600 leading-tight">
            เลขประจำตัวผู้เสียภาษี {SELLER_INFO.taxId}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-bold text-2xl text-blue-900 mb-1">
          {labels.title}
        </span>
        <div className="text-xs text-gray-600">
          <div>
            เลขที่: {document.document_number || document.documentNumber || "-"}
          </div>
          <div>
            วันที่: {formatDate(document.issue_date || document.documentDate)}
          </div>
        </div>
      </div>
    </div>
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 px-4 py-3 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <div className="font-bold text-blue-800 text-sm">ข้อมูลลูกค้า</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center">
          <div className="font-semibold text-blue-700 min-w-[60px]">ชื่อ:</div>
          <div className="text-gray-800">
            {document.customer_name || document.customer?.name || "-"}
          </div>
        </div>
        <div className="flex items-center">
          <div className="font-semibold text-blue-700 min-w-[60px]">โทร:</div>
          <div className="text-gray-800">
            {document.customer_phone || document.customer?.phone || "-"}
          </div>
        </div>
        <div className="flex items-start sm:col-span-2">
          <div className="font-semibold text-blue-700 min-w-[60px]">
            ที่อยู่:
          </div>
          <div className="text-gray-800 flex-1">
            {document.customer_address || document.customer?.address || "-"}
          </div>
        </div>
        <div className="flex items-center sm:col-span-2">
          <div className="font-semibold text-blue-700 min-w-[60px]">
            เลขประจำตัวผู้เสียภาษี:
          </div>
          <div className="text-gray-800">
            {document.customer_tax_id || document.customer?.tax_id || "-"}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const DocumentFooter = ({
  type,
  document,
  summary,
}: {
  type: string;
  document: any;
  summary: any;
}) => {
  const netTotal = (summary.total || 0) - (summary.withholdingTax || 0);
  return (
    <div className="pt-4 avoid-break">
      <div className="flex items-start justify-between">
        <div className="w-1/2 pr-4 text-xs">
          {/* ---  START: ส่วนที่ปรับปรุง --- */}
          {type === "receipt" && document.receipt_details && (
            <div className="bg-green-50 rounded-lg border border-green-200 px-4 py-3 mb-3">
              <div className="font-bold text-green-700 mb-2 text-sm">
                ข้อมูลการรับชำระ
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">วันที่ชำระ:</span>{" "}
                  {formatDate(document.receipt_details.payment_date)}
                </div>
                {/* วนลูปแสดงทุกช่องทางการชำระเงิน */}
                {Array.isArray(document.receipt_details.payment_channels) &&
                  document.receipt_details.payment_channels.length > 0 && (
                    <div>
                      <div className="font-semibold mb-1">ช่องทางการชำระ:</div>
                      <div className="space-y-1 pl-2">
                        {document.receipt_details.payment_channels.map(
                          (channel: any, index: number) => (
                            <div
                              key={index}
                              className="flex justify-between items-center text-xs"
                            >
                              <span>
                                -{" "}
                                {channel.method || channel.channel || "ไม่ระบุ"}
                              </span>
                              <span className="font-semibold">
                                {formatCurrency(channel.amount || 0)}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                <div className="border-t border-green-200 mt-2 pt-2">
                  <span className="font-semibold">ยอดรวมที่รับชำระ:</span>{" "}
                  {formatCurrency(
                    document.receipt_details.net_total_receipt || 0
                  )}
                </div>
              </div>
            </div>
          )}
          {/* ---  END: ส่วนที่ปรับปรุง --- */}
          <div className="text-gray-600 mt-2">
            <b>หมายเหตุ:</b> {document.notes || "-"}
          </div>
        </div>
        <div className="w-1/2 max-w-xs">
          <div className="min-w-48 space-y-1 bg-blue-50 rounded-lg p-3 text-xs">
            <div className="flex justify-between">
              <span>รวมเป็นเงิน:</span>
              <span>
                {formatCurrency(
                  (summary.subtotal || 0) + (summary.discount || 0)
                )}
              </span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>ส่วนลด:</span>
                <span>-{formatCurrency(summary.discount || 0)}</span>
              </div>
            )}
            {summary.tax > 0 && (
              <div className="flex justify-between">
                <span>ภาษีมูลค่าเพิ่ม:</span>
                <span>{formatCurrency(summary.tax || 0)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-1 mt-1">
              <div className="flex justify-between font-bold text-base">
                <span>รวมทั้งสิ้น:</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-center font-semibold">
                  ({numberToThaiText(netTotal)})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-end mt-6">
        <div className="text-xs text-gray-500">
          ขอขอบพระคุณที่ไว้วางใจใช้บริการ
        </div>
        <div className="text-center">
          <div className="h-8"></div>
          <div className="border-t-2 border-gray-400 w-40 mb-1 pt-1 text-xs">
            ผู้รับเงิน
          </div>
        </div>
      </div>
    </div>
  );
};

// =================================================================
// START: The Printable Component - Final, Simple & Correct Version
// =================================================================
const PrintableDocument = React.forwardRef<HTMLDivElement, any>(
  ({ document, type, labels, items, summary }, ref) => {
    const tableColumns = 4; // จำนวนคอลัมน์ของตารางสินค้า
    return (
      <div ref={ref}>
        <style>
          {`
                     @media print {
                         @page {
                             size: A4;
                             margin: 15mm;
                         }
                         html, body {
                             -webkit-print-color-adjust: exact !important;
                             print-color-adjust: exact !important;
                             font-size: 10pt;
                         }
                         /* --- หัวใจของการทำงาน --- */
                         thead { 
                             display: table-header-group !important; 
                             page-break-after: avoid !important;
                         }
                         tfoot { 
                             display: table-footer-group !important; 
                             page-break-before: avoid !important;
                         }
                         tr, td, th { page-break-inside: avoid !important; }
                         .avoid-break { page-break-inside: avoid !important; }
                         
                         /* ทำให้หัวกระดาษแสดงในทุกหน้า */
                         table thead tr:first-child th {
                             position: running(header);
                             page-break-after: avoid !important;
                         }
                         
                         /* กำหนดให้หัวกระดาษแสดงในทุกหน้า */
                         @page {
                             @top-center {
                                 content: element(header);
                             }
                         }
                     }
                 `}
        </style>

        <table className="w-full">
          {/* === 1. ส่วนหัวที่จะแสดงซ้ำทุกหน้า === */}
          <thead>
            <tr>
              <th colSpan={tableColumns}>
                <DocumentHeaderAndCustomer
                  labels={labels}
                  document={document}
                />
              </th>
            </tr>
            <tr className="text-xs bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-left font-semibold">
                รายการ
              </th>
              <th className="border border-gray-300 px-2 py-1 text-center font-semibold w-20">
                จำนวน
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right font-semibold w-28">
                ราคา/หน่วย
              </th>
              <th className="border border-gray-300 px-2 py-1 text-right font-semibold w-28">
                จำนวนเงิน
              </th>
            </tr>
          </thead>

          {/* === 2. ส่วนท้ายที่จะแสดงซ้ำทุกหน้า === */}
          <tfoot>
            <tr>
              <td colSpan={tableColumns}>
                <DocumentFooter
                  type={type}
                  document={document}
                  summary={summary}
                />
              </td>
            </tr>
          </tfoot>

          {/* === 3. เนื้อหารายการสินค้าที่จะไหลไปเรื่อยๆ === */}
          <tbody>
            {items.map((item, itemIndex) => (
              <tr key={itemIndex} className="text-xs">
                <td className="border-x border-b border-gray-300 px-2 py-2 align-top">
                  {item.product_name || item.productTitle || item.description}
                </td>
                <td className="border-b border-r border-gray-300 px-2 py-2 text-center align-top">
                  {item.quantity}
                </td>
                <td className="border-b border-gray-300 px-2 py-2 text-right align-top">
                  {formatCurrency(item.unitPrice || 0)}
                </td>
                <td className="border-x border-b border-gray-300 px-2 py-2 text-right font-semibold align-top">
                  {formatCurrency(item.amount || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

// --- Main Modal Component (ไม่เปลี่ยนแปลง) ---
const DocumentModal: React.FC<DocumentModalProps> = ({
  type,
  document,
  open,
  onClose,
}) => {
  const labels = typeLabels[type];
  const items: DocumentItem[] = (
    Array.isArray(document.items) && document.items.length > 0
      ? document.items
      : []
  ).map((item) => ({
    ...item,
    unitPrice: item.unitPrice ?? item.unit_price ?? 0,
  }));
  const summary = document.summary || {
    subtotal: 0,
    tax: 0,
    total: 0,
    discount: 0,
    withholdingTax: 0,
  };

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `${labels.title} - ${
      document.document_number || document.documentNumber
    }`,
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-4xl relative text-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold"
        >
          &times;
        </button>
        <div style={{ maxHeight: "85vh", overflowY: "auto", padding: "1rem" }}>
          {/* --- ส่วนที่แสดงผลบนหน้าจอ --- */}
          <DocumentHeaderAndCustomer labels={labels} document={document} />
          <div className="document-table mb-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="text-xs bg-gray-50">
                  <th className="border border-gray-300 px-2 py-1 text-left font-semibold">
                    รายการ
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-center font-semibold w-20">
                    จำนวน
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold w-28">
                    ราคา/หน่วย
                  </th>
                  <th className="border border-gray-300 px-2 py-1 text-right font-semibold w-28">
                    จำนวนเงิน
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="border-x border-b border-gray-300 px-2 py-2 align-top">
                      {item.product_name ||
                        item.productTitle ||
                        item.description ||
                        "-"}
                    </td>
                    <td className="border-b border-r border-gray-300 px-2 py-2 text-center align-top">
                      {item.quantity}
                    </td>
                    <td className="border-b border-gray-300 px-2 py-2 text-right align-top">
                      {formatCurrency(item.unitPrice || 0)}
                    </td>
                    <td className="border-x border-b border-gray-300 px-2 py-2 text-right font-semibold align-top">
                      {formatCurrency(item.amount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DocumentFooter type={type} document={document} summary={summary} />
        </div>
        {/* --- ปุ่มปริ้น --- */}
        <div className="flex justify-end mt-4 pt-4 border-t">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <span className="text-lg">🖨️</span>
            <span>ปริ้นเอกสาร</span>
          </button>
        </div>
        {/* --- ส่วนที่ซ่อนไว้สำหรับพิมพ์ --- */}
        <div className="hidden">
          <PrintableDocument
            ref={componentRef}
            document={document}
            type={type}
            labels={labels}
            items={items}
            summary={summary}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;
