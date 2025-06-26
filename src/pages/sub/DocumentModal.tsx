import React from "react";

interface DocumentItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface DocumentSummary {
  subtotal: number;
  tax: number;
  total: number;
}

interface Quotation {
  items: DocumentItem[];
  summary: DocumentSummary;
  // เพิ่ม field เฉพาะ quotation ได้ที่นี่
}

interface Invoice {
  items: DocumentItem[];
  summary: DocumentSummary;
  // เพิ่ม field เฉพาะ invoice ได้ที่นี่
}

interface DocumentModalProps {
  type: "quotation" | "invoice";
  document: Quotation | Invoice;
  open: boolean;
  onClose: () => void;
}

const typeLabels = {
  quotation: {
    title: "ใบเสนอราคา",
    itemLabel: "รายการ",
    priceLabel: "หน่วยละ",
    summaryLabel: "รวมเป็นเงิน",
    taxLabel: "ภาษีมูลค่าเพิ่ม",
    totalLabel: "รวมทั้งสิ้น",
  },
  invoice: {
    title: "ใบแจ้งหนี้",
    itemLabel: "รายการ",
    priceLabel: "หน่วยละ",
    summaryLabel: "รวมเป็นเงิน",
    taxLabel: "ภาษีมูลค่าเพิ่ม",
    totalLabel: "รวมทั้งสิ้น",
  },
};

const DocumentModal: React.FC<DocumentModalProps> = ({ type, document, open, onClose }) => {
  if (!open) return null;
  const labels = typeLabels[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-2xl print:relative print:shadow-none print:p-0">
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-bold">{labels.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 print:hidden">&times;</button>
        </div>
        {/* Table */}
        <table className="w-full border mb-4 print:text-xs">
          <thead>
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">{labels.itemLabel}</th>
              <th className="border p-2">จำนวน</th>
              <th className="border p-2">{labels.priceLabel}</th>
              <th className="border p-2">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            {document.items.map((item, idx) => (
              <tr key={idx}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{item.description}</td>
                <td className="border p-2 text-right">{item.quantity}</td>
                <td className="border p-2 text-right">{item.unitPrice.toLocaleString()}</td>
                <td className="border p-2 text-right">{item.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Summary */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs">
            <div className="flex justify-between mb-1">
              <span>{labels.summaryLabel}</span>
              <span>{document.summary.subtotal.toLocaleString()} บาท</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>{labels.taxLabel}</span>
              <span>{document.summary.tax.toLocaleString()} บาท</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>{labels.totalLabel}</span>
              <span>{document.summary.total.toLocaleString()} บาท</span>
            </div>
          </div>
        </div>
        {/* หมายเหตุ/เงื่อนไข เพิ่มเติมตาม type ได้ที่นี่ */}
      </div>
    </div>
  );
};

export default DocumentModal;
