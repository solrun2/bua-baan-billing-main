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
  name: string;
  taxId: string;
  phone: string;
  address: string;
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
