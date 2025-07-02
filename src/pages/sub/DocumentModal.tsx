import React, { useEffect, useState } from "react";

interface DocumentItem {
  product_id?: string;
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
  tax?: number;
  amountBeforeTax?: number;
  amount_before_tax?: number;
  withholdingTaxAmount?: number;
  withholding_tax_amount?: number;
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
  issue_date?: string;
  valid_until?: string;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_tax_id?: string;
  notes?: string;
  items: DocumentItem[];
  summary: DocumentSummary;
  reference?: string;
}

interface Quotation extends DocumentBase {
  // เพิ่ม field เฉพาะ quotation ได้ที่นี่
}

interface Invoice extends DocumentBase {
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

const KETSHOP_API_TOKEN =
  "eyJhbGciOiJFZERTQSIsImtpZCI6IjAxOTc2Nzg5LWNkODktNzYyZS1iMTM5LTFkZjIzZTUyYzQ3YiJ9.eyJjbGllbnRfaWQiOiIwMTk3Njc4OS1jZDg5LTc2MmUtYjEzOS0xZGYyM2U1MmM0N2IiLCJrZXRfd2ViX2lkIjoxMzE3LCJzY29wZXMiOlsiYWxsIl0sIm5hbWUiOiJJbnRlcm5zaGlwIiwiZG9tYWluIjoidWF0LmtldHNob3B0ZXN0LmNvbSIsInN1YiI6IjAxOTc2NzhiLTQ3YmUtNzA4YS04MTFkLWEwZWNiMDg1OTdiMCIsImlhdCI6MTc0OTc4ODg3MH0.OSbUayE_yS9IqOKLFrgsAGPJepiW7Otn3vzvE1SL9ijTpJmsGydGAP1_4AZA75cTmlXy583iS81EZxZszeYaBg"; // TODO: เปลี่ยนเป็น token จริง

const SELLER_INFO = {
  company: "บริษัท Tomato Ideas COMPANY LIMITED - UAT จำกัด",
  address:
    "เลขที่ 21 ซอย สุดสงวนท่าไม้ แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพมหานคร 10130",
  taxId: "0155562052664 (สำนักงานใหญ่)",
  website: "www.tomato-ideas.com",
  phone: "-",
  bankAccounts: [
    { bank: "ธ.กสิกรไทย", acc: "ออมทรัพย์ 123-456789-0", branch: "KB06" },
    { bank: "ธ.กรุงศรี", acc: "ออมทรัพย์ 123-456789-0", branch: "KB06" },
    { bank: "ธ.กรุงเทพ", acc: "ออมทรัพย์ 123-456789-0", branch: "KB06" },
    { bank: "ธ.ไทยพาณิชย์", acc: "ออมทรัพย์ 1111111111", branch: "" },
  ],
};

// Helper to calculate summary if missing or zero
function calculateSummaryFromItems(items: DocumentItem[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let tax = 0;
  let total = 0;
  let withholdingTaxTotal = 0;
  items.forEach((item) => {
    const qty = item.quantity ?? 1;
    const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
    const discount = item.discount ?? 0;
    const discountType = item.discount_type ?? item.discountType ?? "thb";
    const itemSubtotal = unitPrice * qty;
    let itemDiscount = 0;
    if (discountType === "percentage") {
      itemDiscount = itemSubtotal * (discount / 100);
    } else {
      itemDiscount = discount * qty;
    }
    const amountBeforeTax = itemSubtotal - itemDiscount;
    const itemTaxRate = item.tax ?? 0;
    const itemTax = amountBeforeTax * (itemTaxRate / 100);
    subtotal += itemSubtotal;
    discountTotal += itemDiscount;
    tax += itemTax;
    total += amountBeforeTax + itemTax;
    // Withholding tax (support both camelCase and snake_case)
    const wht = item.withholdingTaxAmount ?? item.withholding_tax_amount ?? 0;
    withholdingTaxTotal += wht;
  });
  return {
    subtotal,
    discount: discountTotal,
    tax,
    total,
    withholdingTax: withholdingTaxTotal,
  };
}

const DocumentModal: React.FC<DocumentModalProps> = ({
  type,
  document,
  open,
  onClose,
}) => {
  const [productMap, setProductMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!open || !document?.items) {
      return;
    }
    const ids = (document.items || [])
      .map((item: any) => String(item.product_id))
      .filter(
        (id: string) => !!id && id !== "" && id !== "undefined" && id !== "null"
      );
    const body = { id: ids };
    if (ids.length === 0) return;
    const fetchProducts = async () => {
      try {
        const res = await fetch(
          "https://openapi.ketshoptest.com/product/search",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${KETSHOP_API_TOKEN}`,
            },
            body: JSON.stringify(body),
          }
        );
        if (!res.ok) {
          setProductMap({});
          return;
        }
        const data = await res.json();
        if (!data.data || !Array.isArray(data.data)) {
          setProductMap({});
          return;
        }
        const map: Record<string, any> = {};
        (data.data || []).forEach((prod: any) => {
          map[String(prod.id)] = prod;
        });
        setProductMap(map);
      } catch (e) {
        setProductMap({});
      }
    };
    fetchProducts();
  }, [open, document]);

  // Helper for date formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("th-TH");
  };

  if (!open) return null;
  const labels = typeLabels[type];

  // Use summary from document, or recalculate if missing/zero
  const summary =
    document.summary && document.summary.subtotal > 0
      ? document.summary
      : calculateSummaryFromItems(document.items || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-3xl print:relative print:shadow-none print:p-0 print:bg-white relative text-[14px]">
        {/* ปุ่มปิดขวาบน */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold print:hidden"
          aria-label="ปิด"
        >
          &times;
        </button>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="font-bold text-lg text-blue-900">ใบเสนอราคา</div>
            <div className="mt-2">
              <div>
                <b>ผู้ขาย :</b> {SELLER_INFO.company}
              </div>
              <div>
                <b>ที่อยู่ :</b> {SELLER_INFO.address}
              </div>
              <div>
                <b>เลขประจำตัวผู้เสียภาษี :</b> {SELLER_INFO.taxId}
              </div>
              <div>
                <b>เว็บไซต์ :</b> {SELLER_INFO.website}
              </div>
              <div>
                <b>โทร :</b> {SELLER_INFO.phone}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div>
              <b>เลขที่เอกสาร :</b> {document.document_number}
            </div>
            <div>
              <b>วันที่ :</b> {formatDate(document.issue_date)}
            </div>
            <div>
              <b>วันถึงกำหนด :</b> {formatDate(document.valid_until)}
            </div>
            <div>
              <b>อ้างอิง :</b> {document.reference || "-"}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="bg-blue-50 rounded p-2 mb-4">
          <div>
            <b>ลูกค้า :</b> {document.customer_name}
          </div>
          <div>
            <b>ที่อยู่ :</b> {document.customer_address}
          </div>
          <div>
            <b>โทร :</b> {document.customer_phone}
          </div>
          <div>
            <b>อีเมล :</b> {document.customer_email}
          </div>
          <div>
            <b>เลขประจำตัวผู้เสียภาษี :</b> {document.customer_tax_id}
          </div>
        </div>

        {/* Table */}
        <table className="w-full border mb-4 text-xs">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="border p-1">#</th>
              <th className="border p-1">รายการ</th>
              <th className="border p-1">จำนวน</th>
              <th className="border p-1">หน่วย</th>
              <th className="border p-1">ราคา</th>
              <th className="border p-1">ส่วนลด</th>
              <th className="border p-1">VAT</th>
              <th className="border p-1">มูลค่าก่อนภาษี</th>
            </tr>
          </thead>
          <tbody>
            {(document.items || []).map((item, idx) => {
              const prod = productMap[item.product_id];
              return (
                <tr key={idx}>
                  <td className="border p-1 text-center">{idx + 1}</td>
                  <td className="border p-1">
                    {prod?.name ||
                      item.product_name ||
                      item.productTitle ||
                      item.description ||
                      "-"}
                  </td>
                  <td className="border p-1 text-center">{item.quantity}</td>
                  <td className="border p-1 text-center">
                    {prod?.unit || item.unit || "-"}
                  </td>
                  <td className="border p-1 text-right">
                    {(item.unitPrice ?? item.unit_price ?? 0).toLocaleString(
                      undefined,
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                    )}
                  </td>
                  <td className="border p-1 text-right">
                    {(() => {
                      const discount = item.discount ?? 0;
                      const qty = item.quantity ?? 1;
                      const unitPrice = item.unitPrice ?? item.unit_price ?? 0;
                      const discountType =
                        item.discount_type ?? item.discountType ?? "thb";
                      if (discountType === "percentage") {
                        const discountAmount =
                          unitPrice * qty * (discount / 100);
                        return `${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      } else {
                        const discountAmount = discount * qty;
                        return `${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                      }
                    })()}
                  </td>
                  <td className="border p-1 text-center">
                    {item.tax ? `${item.tax}%` : "-"}
                  </td>
                  <td className="border p-1 text-right">
                    {(
                      item.amountBeforeTax ??
                      item.amount_before_tax ??
                      0
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end mb-2">
          <div className="w-full max-w-xs space-y-1">
            <div className="flex justify-between mb-1">
              <span>มูลค่าสินค้าหรือค่าบริการ</span>
              <span>
                {summary.subtotal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                บาท
              </span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between mb-1 text-destructive">
                <span>ส่วนลด</span>
                <span>
                  -
                  {summary.discount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  บาท
                </span>
              </div>
            )}
            {summary.withholdingTax > 0 && (
              <div className="flex justify-between mb-1 text-yellow-700">
                <span>หัก ณ ที่จ่าย</span>
                <span>
                  -
                  {summary.withholdingTax.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  บาท
                </span>
              </div>
            )}
            <div className="flex justify-between mb-1">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>
                {summary.tax.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                บาท
              </span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>
                {summary.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                บาท
              </span>
            </div>
          </div>
        </div>

        {/* Bank Accounts */}
        <div className="mt-4">
          <b>ชำระเงิน</b>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {SELLER_INFO.bankAccounts.map((acc, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="font-bold">{acc.bank}</span>
                <span>{acc.acc}</span>
                <span>{acc.branch}</span>
              </div>
            ))}
          </div>
        </div>

        {/* หมายเหตุ */}
        {document.notes && (
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-900 border border-yellow-200">
            <span className="font-semibold">หมายเหตุ: </span>
            {document.notes}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentModal;
