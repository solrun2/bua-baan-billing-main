import React, { useEffect, useState } from "react";
import { formatCurrency } from "../../lib/utils";
import { calculateSummaryFromItems } from "../../utils/documentUtils";

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
  documentNumber?: string;
  issue_date?: string;
  documentDate?: string;
  valid_until?: string;
  validUntil?: string;
  due_date?: string;
  dueDate?: string;
  customer_name?: string;
  customer_address?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_tax_id?: string;
  notes?: string;
  items: DocumentItem[];
  summary: DocumentSummary;
  reference?: string;
  referenceNumber?: string;
  total_amount?: number;
  related_document_id?: number;
  items_recursive?: DocumentItem[]; // เพิ่ม field นี้
  customer?: {
    id?: string;
    name?: string;
    tax_id?: string;
    phone?: string;
    address?: string;
    email?: string;
  };
}

interface Quotation extends DocumentBase {
  // เพิ่ม field เฉพาะ quotation ได้ที่นี่
}

interface Invoice extends DocumentBase {
  // เพิ่ม field เฉพาะ invoice ได้ที่นี่
}

interface DocumentModalProps {
  type: "quotation" | "invoice" | "receipt";
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
  receipt: {
    title: "ใบเสร็จรับเงิน",
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

const DocumentModal: React.FC<DocumentModalProps> = ({
  type,
  document,
  open,
  onClose,
}) => {
  const [productMap, setProductMap] = useState<Record<string, any>>({});
  const [relatedDocument, setRelatedDocument] = useState<any>(null);

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

  // Log document และ related_document_id ทุกครั้งที่ modal เปิด
  if (open) {
    console.log("DocumentModal document:", document);
    console.log("related_document_id:", document.related_document_id);
  }

  // ดึงข้อมูลเอกสารที่เกี่ยวข้อง
  useEffect(() => {
    if (!open || !document?.related_document_id) {
      setRelatedDocument(null);
      return;
    }
    // console.log(
    //   "[useEffect] related_document_id:",
    //   document.related_document_id
    // );

    const fetchRelatedDocument = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/api/documents/${document.related_document_id}`
        );
        if (!res.ok) {
          setRelatedDocument(null);
          return;
        }
        const data = await res.json();
        setRelatedDocument(data);
        // console.log("relatedDocument response:", data);
      } catch (e) {
        setRelatedDocument(null);
        // ไม่ต้อง log error
      }
    };

    fetchRelatedDocument();
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

  // เลือก items ที่จะแสดง (ถ้า items ว่าง ให้ใช้ items_recursive)
  const items: DocumentItem[] =
    Array.isArray(document.items) && document.items.length > 0
      ? document.items
      : Array.isArray(document.items_recursive)
        ? document.items_recursive
        : [];
  console.log("DocumentModal items (with fallback):", items);
  console.log("DocumentModal document.items:", document.items);
  console.log(
    "DocumentModal document.items_recursive:",
    document.items_recursive
  );

  // Use summary from document, or recalculate if missing/zero
  const summary =
    document.summary &&
    typeof document.summary.discount !== "undefined" &&
    !isNaN(
      Number((document.summary.discount ?? 0).toString().replace(/,/g, ""))
    )
      ? {
          ...document.summary,
          subtotal: Number(
            (document.summary.subtotal ?? 0).toString().replace(/,/g, "")
          ),
          discount: Number(
            (document.summary.discount ?? 0).toString().replace(/,/g, "")
          ),
          tax: Number((document.summary.tax ?? 0).toString().replace(/,/g, "")),
          total: Number(
            (document.summary.total ?? 0).toString().replace(/,/g, "")
          ),
          withholdingTax: Number(
            (document.summary.withholdingTax ?? 0).toString().replace(/,/g, "")
          ),
        }
      : calculateSummaryFromItems(items);

  console.log("summary", summary);
  console.log("DocumentModal document:", document);
  console.log("DocumentModal items:", document.items);

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
            <div className="font-bold text-lg text-blue-900">
              {labels.title}
            </div>
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
              <b>เลขที่เอกสาร :</b>{" "}
              {document.document_number || document.documentNumber || "-"}
            </div>
            <div>
              <b>วันที่ :</b>{" "}
              {formatDate(document.issue_date || document.documentDate)}
            </div>
            {type === "quotation" ? (
              <div>
                <b>วันถึงกำหนด :</b>{" "}
                {formatDate(
                  Array.isArray((document as any).quotation_details)
                    ? (document as any).quotation_details[0]?.valid_until
                    : (document as any).quotation_details?.valid_until ||
                        document.valid_until ||
                        document.validUntil
                )}
              </div>
            ) : null}
            {type === "invoice" ? (
              <div>
                <b>วันถึงกำหนด :</b>{" "}
                {formatDate(
                  Array.isArray((document as any).invoice_details)
                    ? (document as any).invoice_details[0]?.due_date
                    : (document as any).invoice_details?.due_date ||
                        document.due_date ||
                        document.dueDate
                )}
              </div>
            ) : null}
            {document.related_document_id && (
              <div className="mt-2 text-xs text-muted-foreground">
                {relatedDocument === null ? (
                  "ไม่พบเอกสารอ้างอิง"
                ) : (
                  // แสดงข้อมูลเอกสารอ้างอิงตามปกติ (เช่น เลขที่, วันที่, ฯลฯ)
                  <span>
                    เลขที่เอกสารอ้างอิง:{" "}
                    {relatedDocument?.document_number || "-"}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="bg-blue-50 rounded p-2 mb-4">
          <div>
            <b>ลูกค้า :</b>{" "}
            {document.customer_name || document.customer?.name || "-"}
          </div>
          <div>
            <b>ที่อยู่ :</b>{" "}
            {document.customer_address || document.customer?.address || "-"}
          </div>
          <div>
            <b>โทร :</b>{" "}
            {document.customer_phone || document.customer?.phone || "-"}
          </div>
          <div>
            <b>อีเมล :</b>{" "}
            {document.customer_email || document.customer?.email || "-"}
          </div>
          <div>
            <b>เลขประจำตัวผู้เสียภาษี :</b>{" "}
            {document.customer_tax_id || document.customer?.tax_id || "-"}
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted-foreground">
                  ไม่มีรายการสินค้า/บริการ
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
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
                    <td className="border p-1 text-center">
                      {(item as any).quantity ?? (item as any).qty ?? "-"}
                    </td>
                    <td className="border p-1 text-center">
                      {prod?.unit || item.unit || "-"}
                    </td>
                    <td className="border p-1 text-right">
                      {formatCurrency(item.unitPrice ?? item.unit_price ?? 0)}
                    </td>
                    <td className="border p-1 text-right">
                      {(() => {
                        const discount = item.discount ?? 0;
                        const qty =
                          (item as any).quantity ?? (item as any).qty ?? 1;
                        const unitPrice =
                          item.unitPrice ?? item.unit_price ?? 0;
                        const discountType =
                          item.discount_type ?? item.discountType ?? "thb";
                        let discountAmount = 0;
                        if (discountType === "percentage") {
                          discountAmount = unitPrice * qty * (discount / 100);
                        } else {
                          discountAmount = discount * qty;
                        }
                        return formatCurrency(discountAmount);
                      })()}
                    </td>
                    <td className="border p-1 text-center">
                      {((item as any).tax ?? (item as any).tax_amount)
                        ? `${(item as any).tax ?? (item as any).tax_amount}%`
                        : "-"}
                    </td>
                    <td className="border p-1 text-right">
                      {formatCurrency(
                        item.amountBeforeTax ?? item.amount_before_tax ?? 0
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="flex justify-end mb-2">
          <div className="w-full max-w-xs space-y-1">
            <div className="flex justify-between mb-1">
              <span>มูลค่าสินค้าหรือค่าบริการ</span>
              <span>{formatCurrency(summary.subtotal)}</span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between mb-1 text-destructive">
                <span>ส่วนลด</span>
                <span>-{formatCurrency(summary.discount)}</span>
              </div>
            )}
            <div className="flex justify-between mb-1">
              <span>มูลค่าหลังหักส่วนลด</span>
              <span>
                {formatCurrency(
                  Number(summary.subtotal ?? 0) - Number(summary.discount ?? 0)
                )}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>{formatCurrency(summary.tax)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>รวมเป็นเงิน</span>
              <span>{formatCurrency(summary.total)}</span>
            </div>
            {Number(summary.withholdingTax) !== 0 && (
              <div className="flex justify-between mb-1 text-yellow-700">
                <span>หัก ณ ที่จ่าย</span>
                <span>
                  {" "}
                  -{formatCurrency(Number(summary.withholdingTax ?? 0))}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>
                {formatCurrency(
                  document.total_amount ??
                    summary.total - summary.withholdingTax
                )}
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
