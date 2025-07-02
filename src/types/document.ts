export interface DocumentItem {
  id: string;
  productTitle: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  priceType: "inclusive" | "exclusive" | "none";
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
}

export interface DocumentSummary {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  withholdingTax: number;
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
  summary: DocumentSummary;
  notes: string;
  attachments?: any[];
  documentNumber: string;
  documentDate: string;
  validUntil?: string; // Optional, for quotations
  dueDate?: string; // Optional, for invoices
  reference: string;
  status: string;
  priceType: "inclusive" | "exclusive" | "none";
  updatedAt?: string;
  tags?: string[];
  issueTaxInvoice?: boolean;
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
  priceType: "inclusive" | "exclusive" | "none";
  updatedAt?: string;
  tags?: string[];
  issueTaxInvoice?: boolean;
}
