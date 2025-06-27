import React, { useEffect, useState } from "react";

interface DocumentItem {
  product_id?: string;
  unit?: string;
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

const DocumentModal: React.FC<DocumentModalProps> = ({
  type,
  document,
  open,
  onClose,
}) => {
  console.log("DocumentModal rendered", { open, document });
  const [productMap, setProductMap] = useState<Record<string, any>>({});

  useEffect(() => {
    console.log("useEffect triggered", { open, document });
    if (!open || !document?.items) {
      console.log("Modal not open or document.items missing", {
        open,
        document,
      });
      return;
    }
    console.log("document.items", document?.items);
    const ids = (document.items || [])
      .map((item: any) => String(item.product_id))
      .filter(
        (id: string) => !!id && id !== "" && id !== "undefined" && id !== "null"
      );
    const body = { id: ids };
    console.log("product_ids to fetch", ids);
    console.log("body to fetch", body);
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
          console.error("OpenAPI fetch error", res.status, await res.text());
          setProductMap({});
          return;
        }
        const data = await res.json();
        if (!data.data || !Array.isArray(data.data)) {
          console.error("OpenAPI response missing data", data);
          setProductMap({});
          return;
        }
        console.log("search products:", data.data);
        // สร้าง map id(string) -> product
        const map: Record<string, any> = {};
        (data.data || []).forEach((prod: any) => {
          map[String(prod.id)] = prod;
        });
        console.log("productMap", map);
        setProductMap(map);
      } catch (e) {
        console.error("OpenAPI fetch exception", e);
        setProductMap({});
      }
    };
    fetchProducts();
  }, [open, document]);

  if (!open) return null;
  const labels = typeLabels[type];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-2xl print:relative print:shadow-none print:p-0 print:bg-white relative">
        {/* ปุ่มปิดขวาบน */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold print:hidden"
          aria-label="ปิด"
        >
          &times;
        </button>
        {/* Header */}
        <div className="mb-6 print:mb-2">
          <h2 className="text-2xl font-bold text-blue-900 mb-2 text-left">
            {labels.title}
          </h2>
          <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-700 mb-2 text-left">
            <div>
              <span className="font-semibold">เลขที่เอกสาร:</span>{" "}
              {document?.document_number || "-"}
            </div>
            <div>
              <span className="font-semibold">วันที่:</span>{" "}
              {document?.issue_date
                ? new Date(document.issue_date).toLocaleDateString("th-TH")
                : "-"}
            </div>
            {document?.valid_until && (
              <div>
                <span className="font-semibold">ยืนราคาถึง:</span>{" "}
                {new Date(document.valid_until).toLocaleDateString("th-TH")}
              </div>
            )}
          </div>
          {/* Customer Info */}
          {document?.customer_name && (
            <div className="bg-blue-50 rounded p-2 px-4 mb-2 w-full max-w-lg text-left">
              <div className="font-semibold">
                ลูกค้า: {document.customer_name}
              </div>
              {document.customer_address && (
                <div className="text-xs text-gray-600">
                  ที่อยู่: {document.customer_address}
                </div>
              )}
              {document.customer_phone && (
                <div className="text-xs text-gray-600">
                  โทร: {document.customer_phone}
                </div>
              )}
              {document.customer_email && (
                <div className="text-xs text-gray-600">
                  อีเมล: {document.customer_email}
                </div>
              )}
              {document.customer_tax_id && (
                <div className="text-xs text-gray-600">
                  เลขประจำตัวผู้เสียภาษี: {document.customer_tax_id}
                </div>
              )}
            </div>
          )}
        </div>
        {/* Table */}
        <table className="w-full border mb-4 print:text-xs rounded-lg overflow-hidden">
          <thead className="bg-blue-100 text-blue-900">
            <tr>
              <th className="border p-2">#</th>
              <th className="border p-2">{labels.itemLabel}</th>
              <th className="border p-2">จำนวน</th>
              <th className="border p-2">หน่วย</th>
              <th className="border p-2">{labels.priceLabel}</th>
              <th className="border p-2">ราคารวม</th>
            </tr>
          </thead>
          <tbody>
            {(document?.items || []).map((item, idx) => {
              const prod = productMap[item.product_id];
              return (
                <tr key={idx} className="even:bg-blue-50">
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2">{prod?.name || "-"}</td>
                  <td className="border p-2 text-right">
                    {Number(item.quantity)}
                  </td>
                  <td className="border p-2 text-center">
                    {prod?.unit || item.unit || "-"}
                  </td>
                  <td className="border p-2 text-right">
                    {item.unitPrice?.toLocaleString()}
                  </td>
                  <td className="border p-2 text-right">
                    {item.amount?.toLocaleString()}
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
              <span>{labels.summaryLabel}</span>
              <span>
                {document?.summary?.subtotal?.toLocaleString() ?? 0} บาท
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>{labels.taxLabel}</span>
              <span>{document?.summary?.tax?.toLocaleString() ?? 0} บาท</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>{labels.totalLabel}</span>
              <span>{document?.summary?.total?.toLocaleString() ?? 0} บาท</span>
            </div>
          </div>
        </div>
        {/* Notes */}
        {document?.notes && (
          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-900 border border-yellow-200">
            <span className="font-semibold">หมายเหตุ: </span>
            {document.notes}
          </div>
        )}
        {/* Print Button (ล่างสุด) */}
        <div className="flex justify-end gap-2 mt-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="text-blue-600 border border-blue-200 rounded px-3 py-1 text-sm hover:bg-blue-50 transition"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;
