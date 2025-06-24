export interface QuotationItem {
  id: string;
  productId?: number;
  productTitle: string;
  description: string;
  quantity: number;
  unitPrice: number;
  priceType: 'inclusive' | 'exclusive';
  discount: number;
  discountType: 'thb' | 'percentage';
  tax: number;
  amountBeforeTax: number;
  withholdingTax: number;
  amount: number;
  isEditing?: boolean;
}

export interface QuotationSummary {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}
