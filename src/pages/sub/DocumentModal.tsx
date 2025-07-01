import React, { useEffect, useState } from "react";

interface DocumentItem {
  product_id?: string;
  unit?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  product_name?: string;
  productTitle?: string;
  discount?: number;
  tax?: number;
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

  // Helper for date formatting
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("th-TH");
  };

  if (!open) return null;
  const labels = typeLabels[type];

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
                    {item.unitPrice?.toLocaleString()}
                  </td>
                  <td className="border p-1 text-right">
                    {item.discount?.toLocaleString() || "0.00"}
                  </td>
                  <td className="border p-1 text-center">
                    {item.tax ? `${item.tax}%` : "-"}
                  </td>
                  <td className="border p-1 text-right">
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
              <span>มูลค่าสินค้าหรือค่าบริการ</span>
              <span>
                {document.summary?.subtotal?.toLocaleString() ?? 0} บาท
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>{document.summary?.tax?.toLocaleString() ?? 0} บาท</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>{document.summary?.total?.toLocaleString() ?? 0} บาท</span>
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
