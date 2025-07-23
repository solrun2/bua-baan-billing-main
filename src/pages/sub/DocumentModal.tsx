import React, { useEffect, useState } from "react";
import { formatCurrency } from "../../lib/utils";
import { calculateSummaryFromItems } from "../../utils/documentUtils";

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
  tax?: number;
  amountBeforeTax?: number;
  amount_before_tax?: number;
  taxAmount?: number;
  tax_amount?: number;
  withholdingTaxAmount?: number;
  withholding_tax_amount?: number;
  amount_after_discount?: number;
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
  priceType?: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
  price_type?: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
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
    console.log("receipt_details:", (document as any).receipt_details);
    if ((document as any).receipt_details) {
      console.log(
        "payment_channels:",
        (document as any).receipt_details.payment_channels
      );
    }
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

  const labels = typeLabels[type];

  // เลือก items ที่จะแสดง (logic เดียวกันทุก type)
  // 1. map unitPrice => unitPrice
  const items: DocumentItem[] =
    Array.isArray(document.items) && document.items.length > 0
      ? document.items.map((item) => ({
          ...item,
          unitPrice: item.unitPrice ?? item.unit_price ?? 0,
        }))
      : Array.isArray(document.items_recursive)
        ? document.items_recursive.map((item) => ({
            ...item,
            productId: item.productId ?? item.product_id,
            productTitle: item.productTitle ?? item.product_name,
            unitPrice: item.unitPrice ?? item.unit_price ?? 0,
          }))
        : [];

  // Use summary from document, or recalculate if missing/zero
  const summary = document.summary || {
    subtotal: (document as any).subtotal ?? 0,
    tax: (document as any).tax_amount ?? 0,
    total: (document as any).total_amount ?? 0,
    discount: (document as any).discount ?? 0,
    withholdingTax: (document as any).withholdingTax ?? 0,
  };

  // --- Section Helper Functions ---
  // Header: โลโก้+ชื่อบริษัท (ซ้าย), Document Title (ขวาบน, บรรทัดเดียว)
  const renderHeader = () => (
    <div className="flex flex-row justify-between items-end border-b-2 border-blue-200 pb-3 mb-3">
      <div className="flex flex-row items-center gap-4">
        <div className="w-14 h-14 border-2 border-blue-200 rounded-full flex items-center justify-center text-blue-300 text-base font-bold">
          LOGO
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-xl text-blue-900 leading-tight">
            {SELLER_INFO.company}
          </span>
          <span className="text-sm text-gray-700 leading-tight">
            {SELLER_INFO.address}
          </span>
          <span className="text-sm text-gray-700 leading-tight">
            เลขประจำตัวผู้เสียภาษี {SELLER_INFO.taxId}
          </span>
          <span className="text-sm text-gray-700 leading-tight">
            โทร {SELLER_INFO.phone}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <span className="font-extrabold text-3xl text-blue-700 mb-1 whitespace-nowrap">
          {typeLabels[type].title}
        </span>
        <div className="text-sm text-gray-700 text-right">
          <div>
            <b>เลขที่:</b>{" "}
            {document.document_number || document.documentNumber || "-"}
          </div>
          <div>
            <b>วันที่:</b>{" "}
            {formatDate(document.documentDate || document.issue_date)}
          </div>
          {type === "invoice" && (
            <div>
              <b>ครบกำหนด:</b>{" "}
              {formatDate(document.due_date || document.dueDate)}
            </div>
          )}
          {type === "quotation" && (
            <div>
              <b>วันหมดอายุ:</b> {formatDate(document.validUntil)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Section ข้อมูลลูกค้า (แสดงใต้ header ก่อนตาราง)
  const renderCustomerInfo = () => (
    <div className="bg-blue-50 rounded-lg border border-blue-200 px-5 py-3 mb-4 max-w-2xl shadow-sm">
      <div className="font-bold text-blue-700 mb-2 text-base">ข้อมูลลูกค้า</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-800">
        <div className="font-bold">ชื่อลูกค้า</div>
        <div>{document.customer_name || document.customer?.name || "-"}</div>
        <div className="font-bold">ที่อยู่</div>
        <div>
          {document.customer_address || document.customer?.address || "-"}
        </div>
        <div className="font-bold">เลขผู้เสียภาษี</div>
        <div>
          {document.customer_tax_id || document.customer?.tax_id || "-"}
        </div>
        <div className="font-bold">โทร</div>
        <div>{document.customer_phone || document.customer?.phone || "-"}</div>
        <div className="font-bold">อีเมล</div>
        <div>{document.customer_email || document.customer?.email || "-"}</div>
      </div>
    </div>
  );

  // ตารางสินค้า: เพิ่มคอลัมน์ 'ส่วนลด' และ 'ภาษี'
  // 2. renderTable: ใช้ unitPrice เป็นหลัก
  const renderTable = () => {
    return (
      <table className="w-full border border-gray-300 mb-4 text-sm rounded-lg overflow-hidden shadow-sm">
        <thead className="bg-gray-100 text-gray-900">
          <tr>
            <th className="border border-gray-300 p-1 w-6 font-bold">ลำดับ</th>
            <th className="border border-gray-300 p-1 w-[30%] text-left font-bold">
              รายการสินค้า
            </th>
            <th className="border border-gray-300 p-1 w-10 font-bold">จำนวน</th>
            <th className="border border-gray-300 p-1 w-16 text-right font-bold">
              ราคาต่อหน่วย
            </th>
            <th className="border border-gray-300 p-1 w-16 text-right font-bold">
              ส่วนลด
            </th>
            <th className="border border-gray-300 p-1 w-12 text-center font-bold">
              VAT
            </th>
            <th className="border border-gray-300 p-1 w-20 text-right font-bold">
              ราคารวม
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={7}
                className="text-center text-muted-foreground py-2"
              >
                ไม่มีรายการสินค้า/บริการ
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const prod = productMap[item.product_id];
              const qty = Number(item.quantity ?? 1);
              // ใช้ field จาก backend/ฟอร์ม โดยรองรับทั้ง unitPrice และ unit_price
              const displayUnitPrice = item.unitPrice ?? item.unit_price ?? 0;
              // ส่วนลด (คำนวณเองถ้าไม่มีใน db)
              const discount = Number(item.discount ?? 0);
              const discountType =
                item.discount_type ?? item.discountType ?? "thb";
              let discountAmount = 0;
              if (discountType === "percentage") {
                discountAmount = displayUnitPrice * qty * (discount / 100);
              } else {
                discountAmount = discount * qty;
              }
              // VAT (แสดง % ตาม field tax)
              const vat = (item.tax ?? item.tax_amount) || 0;
              // ราคารวม: ใช้ amount จาก backend ตรงๆ ถ้ามี ถ้าไม่มี fallback เป็น 0
              const displayTotal = item.amount ?? 0;
              return (
                <tr key={idx}>
                  <td className="border border-gray-300 p-1 text-center">
                    {idx + 1}
                  </td>
                  <td className="border border-gray-300 p-1 text-left">
                    {prod?.name ||
                      item.product_name ||
                      item.productTitle ||
                      item.description ||
                      "-"}
                  </td>
                  <td className="border border-gray-300 p-1 text-center">
                    {qty}
                  </td>
                  <td className="border border-gray-300 p-1 text-right bg-yellow-100 font-bold text-yellow-700">
                    {formatCurrency(displayUnitPrice)}
                  </td>
                  <td className="border border-gray-300 p-1 text-right">
                    {discountAmount > 0 ? formatCurrency(discountAmount) : "-"}
                  </td>
                  <td className="border border-gray-300 p-1 text-center">
                    {vat ? `${vat}%` : "-"}
                  </td>
                  <td className="border border-gray-300 p-1 text-right">
                    {formatCurrency(displayTotal)}
                  </td>
                </tr>
              );
            })
          )}
          {/* แถวว่างสำหรับเขียนเพิ่ม - ลดจำนวนแถว */}
          {Array.from({ length: Math.max(0, 1 - items.length) }).map((_, i) => (
            <tr key={"empty-" + i}>
              <td className="border border-gray-300 p-1 text-center">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-left">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-center">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-right">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-right">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-center">&nbsp;</td>
              <td className="border border-gray-300 p-1 text-right">&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // สรุปยอด: แก้ไขให้ใช้ค่าจาก summary backend เท่านั้น
  const renderSummary = () => {
    // รวม withholding tax จาก summary หรือจากทุกแถว
    const summaryWithholdingTax =
      typeof summary.withholdingTax === "number" && summary.withholdingTax > 0
        ? summary.withholdingTax
        : 0;
    const afterDiscount = summary.subtotal - summary.discount;
    return (
      <div className="flex justify-end mb-2">
        <div className="w-full max-w-xs space-y-1 bg-blue-50 rounded-lg p-3 shadow-sm">
          <div className="flex justify-between mb-1 text-sm">
            <span>มูลค่าสินค้าหรือค่าบริการ</span>
            <span className="font-semibold">
              {formatCurrency(summary.subtotal)}
            </span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>ส่วนลดรวม</span>
            <span className="text-red-500">
              -{formatCurrency(summary.discount)}
            </span>
          </div>
          <div className="flex justify-between mb-1 text-sm">
            <span>ยอดหลังหักส่วนลด</span>
            <span>{formatCurrency(afterDiscount)}</span>
          </div>
          {summary.tax > 0 && (
            <div className="flex justify-between mb-1 text-sm">
              <span>ภาษีมูลค่าเพิ่ม 7%</span>
              <span>{formatCurrency(summary.tax)}</span>
            </div>
          )}
          {summary.tax > 0 && (
            <div className="flex justify-between mb-1 font-semibold text-sm">
              <span>ยอดรวมหลังรวมภาษี</span>
              <span>{formatCurrency(Number(summary.total ?? 0))}</span>
            </div>
          )}
          <div className="flex justify-between mb-1 text-yellow-700 text-sm">
            <span>หัก ณ ที่จ่าย</span>
            <span>-{formatCurrency(summaryWithholdingTax)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-blue-200 pt-1 mt-1">
            <span>จำนวนเงินทั้งสิ้น</span>
            <span className="text-blue-700">
              {formatCurrency(
                Number(summary.total ?? 0) - summaryWithholdingTax
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    switch (type) {
      case "quotation":
        return (
          <div className="mt-4 text-xs text-gray-600">
            <b>เงื่อนไขการชำระเงิน:</b> กรุณาชำระเงินภายในวันที่{" "}
            {formatDate(document.validUntil)}
            <br />
            <b>หมายเหตุ:</b> {document.notes || "-"}
          </div>
        );
      case "invoice":
        return (
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
            {document.notes && (
              <div className="mt-4 p-3 bg-yellow-50 rounded text-sm text-yellow-900 border border-yellow-200">
                <span className="font-semibold">หมายเหตุ (ใบแจ้งหนี้): </span>
                {document.notes}
              </div>
            )}
          </div>
        );
      case "receipt":
        return (
          <div className="mt-4">
            {/* ข้อมูลการรับชำระ */}
            {(document as any).receipt_details && (
              <div className="bg-green-50 rounded-lg border border-green-200 px-4 py-3 mb-3">
                <div className="font-bold text-green-700 mb-2 text-base">
                  ข้อมูลการรับชำระ
                </div>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-sm">
                  <div className="font-semibold">วันที่:</div>
                  <div>
                    {formatDate((document as any).receipt_details.payment_date)}
                  </div>
                  <div></div>

                  <div className="font-semibold">วิธี:</div>
                  <div>
                    {(document as any).receipt_details.payment_method || "-"}
                  </div>
                  <div></div>

                  {(document as any).receipt_details.payment_reference && (
                    <>
                      <div className="font-semibold">อ้างอิง:</div>
                      <div>
                        {(document as any).receipt_details.payment_reference}
                      </div>
                      <div></div>
                    </>
                  )}

                  <div className="font-semibold">ยอดรับ:</div>
                  <div className="font-bold text-green-700">
                    {formatCurrency(
                      (document as any).receipt_details.net_total_receipt || 0
                    )}
                  </div>
                  <div></div>
                </div>

                {/* ช่องทางการชำระเงิน - แสดงแบบกระชับ */}
                {(document as any).receipt_details.payment_channels &&
                  Array.isArray(
                    (document as any).receipt_details.payment_channels
                  ) &&
                  (document as any).receipt_details.payment_channels.length >
                    0 && (
                    <div className="mt-2">
                      <div className="font-semibold text-green-700 mb-1 text-sm">
                        ช่องทางการชำระ:
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(document as any).receipt_details.payment_channels.map(
                          (channel: any, idx: number) => {
                            // Debug: แสดงข้อมูล payment_channels
                            console.log(`Channel ${idx}:`, channel);
                            console.log(`Channel ${idx} type:`, typeof channel);
                            console.log(
                              `Channel ${idx} keys:`,
                              Object.keys(channel || {})
                            );
                            console.log(
                              `Channel ${idx} method:`,
                              channel?.method
                            );
                            console.log(
                              `Channel ${idx} channel:`,
                              channel?.channel
                            );
                            console.log(
                              `Channel ${idx} amount:`,
                              channel?.amount
                            );
                            return (
                              <div
                                key={idx}
                                className="flex justify-between items-center bg-white rounded px-2 py-1 border border-green-100 text-sm"
                              >
                                <div className="flex items-center gap-1">
                                  <span>
                                    {(channel?.method || channel?.channel) ===
                                      "เงินสด" && "💵"}
                                    {(channel?.method || channel?.channel) ===
                                      "โอนเงิน" && "🏦"}
                                    {(channel?.method || channel?.channel) ===
                                      "บัตรเครดิต" && "💳"}
                                    {channel?.method ||
                                      channel?.channel ||
                                      "ไม่ระบุ"}
                                  </span>
                                  {channel?.note && (
                                    <span className="text-gray-500">
                                      ({channel.note})
                                    </span>
                                  )}
                                </div>
                                <div className="font-semibold text-green-700">
                                  {formatCurrency(channel?.amount || 0)}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  )}

                {/* ค่าธรรมเนียม - แสดงแบบกระชับ */}
                {(document as any).receipt_details.fees &&
                  Array.isArray((document as any).receipt_details.fees) &&
                  (document as any).receipt_details.fees.length > 0 &&
                  (document as any).receipt_details.fees.some(
                    (fee: any) => fee.enabled
                  ) && (
                    <div className="mt-2">
                      <div className="font-semibold text-green-700 mb-1 text-sm">
                        ค่าธรรมเนียม:
                      </div>
                      <div className="space-y-1">
                        {(document as any).receipt_details.fees
                          .filter((fee: any) => fee.enabled)
                          .map((fee: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-white rounded px-2 py-1 border border-green-100 text-sm"
                            >
                              <div>
                                {fee.description || `ค่าธรรมเนียม ${idx + 1}`}
                              </div>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(fee.amount || 0)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                {/* เอกสารออฟเซ็ต - แสดงแบบกระชับ */}
                {(document as any).receipt_details.offset_docs &&
                  Array.isArray(
                    (document as any).receipt_details.offset_docs
                  ) &&
                  (document as any).receipt_details.offset_docs.length > 0 &&
                  (document as any).receipt_details.offset_docs.some(
                    (doc: any) => doc.enabled
                  ) && (
                    <div className="mt-2">
                      <div className="font-semibold text-green-700 mb-1 text-sm">
                        เอกสารออฟเซ็ต:
                      </div>
                      <div className="space-y-1">
                        {(document as any).receipt_details.offset_docs
                          .filter((doc: any) => doc.enabled)
                          .map((doc: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex justify-between items-center bg-white rounded px-2 py-1 border border-green-100 text-sm"
                            >
                              <div className="flex items-center gap-1">
                                <span>
                                  {doc.document_number || `เอกสาร ${idx + 1}`}
                                </span>
                                {doc.note && (
                                  <span className="text-gray-500">
                                    ({doc.note})
                                  </span>
                                )}
                              </div>
                              <div className="font-semibold text-green-700">
                                {formatCurrency(doc.amount || 0)}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            <div className="thankyou text-green-700 font-bold text-xl">
              ขอขอบพระคุณที่ไว้วางใจใช้บริการ
            </div>
          </div>
        );
      default:
        return null;
    }
  };
  // --- End Section Helper Functions ---

  // เพิ่มฟังก์ชัน handlePrint
  const handlePrint = () => {
    const printContent =
      window.document.querySelector(".print-area")?.innerHTML;
    const printWindow = window.open("", "", "width=900,height=1200");
    printWindow.document.write(`
      <html>
        <head>
          <title>พิมพ์เอกสาร</title>
          <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
          <style>
            /* สำหรับหน้าจอปกติ */
            .print-area {
              width: 100%;
              max-width: 794px;      /* A4 ที่ 96dpi */
              margin: 32px auto;     /* ขอบขาวรอบ ๆ */
              background: #fff;
              border-radius: 12px;
              box-shadow: 0 4px 32px #0002;
              padding: 32px 24px;
            }
            .company-title {
              margin-bottom: 12px;
            }
            .document-title {
              margin-top: 20px;
            }
            @media print {
              html, body {
                width: 210mm;
                height: 297mm;
                margin: 0;
                padding: 0;
                overflow: hidden;
              }
              .no-print {
                display: none !important;
              }
              .print-area {
                width: 210mm !important;
                height: 297mm !important;
                max-width: 210mm;
                max-height: 297mm;
                overflow: hidden !important;
                transform: scale(0.95);
                transform-origin: top left;
                page-break-inside: avoid !important;
                page-break-before: avoid !important;
                page-break-after: avoid !important;
                margin: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                padding: 15mm 10mm 10mm 10mm !important;
              }
              .header-row, table, .summary-box, .note-box {
                width: 100% !important;
                margin: 0 !important;
                max-width: 100% !important;
              }
              .company-title {
                margin-bottom: 10px;
              }
              .document-title {
                margin-left: auto;
                margin-top: 0;
                margin-bottom: 0;
                align-self: flex-start;
                font-size: 2rem;
                font-weight: bold;
                color: #2563eb;
                text-align: right;
                white-space: nowrap;
              }
              table, tr, td, th, .summary-box, .note-box {
                page-break-inside: avoid !important;
              }
              /* ปรับขนาดตัวอักษรให้ใหญ่ขึ้น */
              .print-area * {
                font-size: 1em !important;
              }
              .print-area h1, .print-area h2, .print-area h3 {
                font-size: 1.3em !important;
              }
              /* ปรับ margin และ padding ให้เหมาะสม */
              .print-area > * {
                margin-bottom: 0.5em !important;
              }
              .print-area table {
                margin-bottom: 0.5em !important;
              }
              .print-area .bg-green-50 {
                margin-bottom: 0.5em !important;
                padding: 0.5em !important;
              }
              .print-area .bg-blue-50 {
                margin-bottom: 0.5em !important;
                padding: 0.5em !important;
              }
              /* ปรับขนาดตาราง */
              .print-area table td,
              .print-area table th {
                padding: 0.4em !important;
              }
              /* ปรับขนาดช่องเซ็น */
              .print-area .flex.justify-end {
                margin-top: 1em !important;
              }
              .print-area .h-8 {
                height: 1.5em !important;
              }
              .print-area .w-40 {
                width: 12em !important;
              }
              /* ปรับขนาดหัวข้อเอกสาร */
              .print-area .font-extrabold.text-lg {
                font-size: 1.2em !important;
              }
              .print-area .font-extrabold.text-2xl {
                font-size: 1.8em !important;
              }
              /* ปรับขนาดข้อความขอบคุณ */
              .print-area .thankyou {
                font-size: 1.2em !important;
              }
              /* กำจัดหน้า 2 */
              @page {
                size: A4;
                margin: 0;
              }
              /* บังคับให้เนื้อหาอยู่ในหน้าเดียว */
              .print-area {
                page-break-after: avoid !important;
                page-break-inside: avoid !important;
              }
              /* ลบส่วนที่อาจทำให้เกิดหน้า 2 */
              .print-area::after {
                display: none !important;
              }
            }
            .modal-scroll {
              max-height: 90vh;
              overflow-y: auto;
            }
          </style>
        </head>
        <body onload="window.print();window.close();">
          <div class="print-area">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 print:bg-transparent">
      <div className="bg-white rounded shadow-lg p-8 w-full max-w-3xl print:relative print:shadow-none print:p-0 print:bg-white relative text-[15px] font-sans">
        <div
          className="modal-scroll"
          style={{ maxHeight: "90vh", overflowY: "auto" }}
        >
          <div className="print-area pt-6">
            {/* ปุ่มปิดขวาบน */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-500 hover:text-red-600 text-2xl font-bold print:hidden no-print"
              aria-label="ปิด"
            >
              &times;
            </button>
            {/* Header */}
            <div className="flex flex-col mb-4 border-b-2 border-blue-200 pb-4">
              <div className="flex justify-between items-start">
                <div>{renderHeader()}</div>
                {/* เส้น header */}
                <hr className="border-blue-200 mb-2" />
              </div>
              {renderCustomerInfo()}
            </div>
            {/* Table */}
            <div className="overflow-x-auto">{renderTable()}</div>
            {/* Summary */}
            <div className="mt-2 mb-4">{renderSummary()}</div>
            {/* Footer */}
            <div className="border-t-2 border-blue-200 pt-2 mt-3">
              {renderFooter()}
            </div>
            {/* กล่องหมายเหตุ (ถ้ามี) */}
            {document.notes && (
              <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-900 border border-yellow-200 max-w-xl mx-auto">
                <span className="font-semibold">หมายเหตุ: </span>
                {document.notes}
              </div>
            )}
            {/* ช่องเซ็นชื่อ */}
            <div className="flex justify-end mt-6 print:mt-8">
              <div className="text-center">
                <div className="h-8 border-b border-gray-400 w-40 mx-auto mb-1"></div>
                <div className="text-xs text-gray-500">(ผู้มีอำนาจลงนาม)</div>
              </div>
            </div>
            {/* ปุ่มปริ้นเอกสาร (ล่างสุดของ modal) */}
            <div className="flex justify-end mt-6 print:hidden no-print">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold shadow-sm border border-blue-200 transition-all duration-150"
                aria-label="ปริ้นเอกสาร"
                title="ปริ้นเอกสาร"
                type="button"
              >
                <span className="text-lg">🖨️</span>
                <span className="hidden sm:inline">ปริ้นเอกสาร</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentModal;
