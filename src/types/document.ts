export interface DocumentItem {
  id: string;
  productTitle: string;
  description: string;
  quantity: number;
  unitPrice: number;
  priceType: 'inclusive' | 'exclusive' | 'none';
  discount: number;
  discountType: 'thb' | 'percentage';
  tax: number;
  amountBeforeTax: number;
  withholdingTax: number;
  amount: number;
  isEditing: boolean;
  productId?: string;
}

export interface DocumentSummary {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface CustomerData {
  name: string;
  taxId: string;
  phone: string;
  address: string;
}

export interface DocumentData {
  id?: string;
  customer: CustomerData;
  items: DocumentItem[];
  summary: DocumentSummary;
  notes: string;
  documentNumber: string;
  documentDate: string;
  validUntil?: string; // Optional, for quotations
  reference: string;
  status: string;
}
