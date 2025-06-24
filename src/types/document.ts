export interface DocumentItem {
  id: string;
  productTitle: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  priceType: 'inclusive' | 'exclusive' | 'none';
  discount: number;
  discountType: 'thb' | 'percentage';
  tax: number;
  amountBeforeTax: number;
  withholdingTax: number | 'custom';
  customWithholdingTaxAmount?: number;
  amount: number;
  isEditing: boolean;
  productId?: string;
  isNew?: boolean;
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

export interface DocumentData {
  id?: string;
  documentType?: 'quotation' | 'invoice' | 'receipt' | 'tax_invoice';
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

  // Invoice specific fields
  issueTaxInvoice?: boolean;
  priceType?: "inclusive" | "exclusive" | "none";
  deposit?: number;
  tags?: string[];
}

export interface Document {
  id: number;
  document_number: string;
  customer_name: string;
  customer_address?: string;
  customer_phone?: string;
  issue_date: string;
  due_date?: string;
  total_amount: number;
  status: string;
  document_type: 'QUOTATION' | 'INVOICE' | 'RECEIPT';
  items?: DocumentItem[];
  payment_method?: string;
  shipping_cost?: number;
}
