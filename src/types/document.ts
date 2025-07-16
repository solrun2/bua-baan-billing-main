export interface DocumentItem {
  id: string;
  productTitle: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  priceType: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
  discount: number;
  discountType: "thb" | "percentage";
  tax: number;
  amountBeforeTax: number;
  withholdingTax: number | "custom";
  customWithholdingTaxAmount?: number;
  amount: number;
  isEditing: boolean;
  productId?: string;
  isNew?: boolean;
  withholding_tax_amount?: number;
  withholdingTaxAmount?: number;
  taxAmount?: number;
  withholding_tax_option?: WithholdingTaxOption;
}

export interface DocumentSummary {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  withholdingTax: number;
  netTotalAmount?: number;
}

export interface CustomerData {
  id?: number;
  name: string;
  tax_id: string;
  phone: string;
  address: string;
  email?: string;
}

export type DocumentType = "quotation" | "invoice" | "receipt" | "tax_invoice";

export type DocumentStatus =
  | "รอตอบรับ"
  | "ตอบรับแล้ว"
  | "พ้นกำหนด"
  | "รอชำระ"
  | "ชำระแล้ว"
  | "ยกเลิก";

export interface DocumentData {
  id?: string;
  documentType?: DocumentType;
  customer: CustomerData;
  items: DocumentItem[];
  items_recursive?: DocumentItem[]; // เพิ่มบรรทัดนี้
  summary: DocumentSummary;
  notes: string;
  attachments?: any[];
  documentNumber: string;
  documentDate: string;
  validUntil?: string; // Optional, for quotations
  dueDate?: string; // Optional, for invoices
  reference: string;
  status: string;
  priceType: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
  updatedAt?: string;
  tags?: string[];
  issueTaxInvoice?: boolean;
  related_document_id?: number;
}

export interface Document {
  id: number;
  document_number: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  issue_date: string;
  due_date?: string;
  valid_until?: string;
  total_amount: number;
  status: string;
  document_type: "QUOTATION" | "INVOICE" | "RECEIPT";
  items?: DocumentItem[];
  payment_method?: string;
  shipping_cost?: number;
  related_document_id?: number; // เพิ่มบรรทัดนี้เพื่อแก้ error
}

export interface DocumentItemPayload {
  product_id: string | null;
  product_name: string;
  unit: string;
  quantity: number;
  unit_price: number;
  amount: number;
  description: string;
  withholding_tax_amount: number;
  amount_before_tax: number;
  discount: number;
  discount_type: "thb" | "percentage";
  tax: number;
  tax_amount: number;
  withholding_tax_option?: WithholdingTaxOption;
}

export interface DocumentPayload {
  id?: string;
  documentType?: DocumentType;
  customer: CustomerData;
  items: DocumentItemPayload[];
  summary: DocumentSummary;
  notes: string;
  attachments?: any[];
  documentNumber: string;
  documentDate: string;
  validUntil?: string;
  dueDate?: string;
  reference: string;
  status: string;
  priceType: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
  updatedAt?: string;
  tags?: string[];
  issueTaxInvoice?: boolean;
}

export type WithholdingTaxOption =
  | "ไม่ระบุ"
  | "ไม่มี"
  | "1%"
  | "1.5%"
  | "2%"
  | "3%"
  | "5%"
  | "10%"
  | "15%"
  | "กำหนดเอง";

export type ReceiptDetails = {
  id?: number;
  document_id: number;
  payment_date?: string;
  payment_method?: string;
  payment_reference?: string;
  /**
   * ตัวอย่าง payment_channels: [
   *   { channel: 'เงินสด', amount: 1000 },
   *   { channel: 'โอน', amount: 500, bank: 'SCB', ref: 'xxx' }
   * ]
   * ตัวอย่าง fees: [
   *   { type: 'ค่าธรรมเนียม', amount: 20 }
   * ]
   * ตัวอย่าง offset_docs: [
   *   { doc_no: 'INV-001', amount: 100 }
   * ]
   * net_total_receipt: 1400
   */
  payment_channels?: any[];
  fees?: any[];
  offset_docs?: any[];
  net_total_receipt?: number;
};
