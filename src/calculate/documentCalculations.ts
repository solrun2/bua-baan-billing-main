import { QuotationItem, QuotationSummary } from "@/types/quotation";

interface BaseItem {
  quantity: number;
  unitPrice: number;
  discount: number;
  discountType: 'percent' | 'thb';
  tax?: number;
}

export interface CalculatedItem {
  subtotal: number;
  discountAmount: number;
  amountBeforeTax: number;
  amount: number;
  taxAmount: number;
}

/**
 * Calculate item amounts including subtotal, discount, tax, and total
 */
export const calculateItemAmounts = (item: BaseItem): CalculatedItem => {
  // Calculate subtotal (quantity * unit price)
  const subtotal = item.quantity * item.unitPrice;
  
  // Calculate discount amount based on discount type
  const discountAmount = item.discountType === 'percent'
    ? (subtotal * item.discount) / 100
    : item.discount * item.quantity; // For THB discount, multiply by quantity
  
  // Calculate amount before tax
  const amountBeforeTax = subtotal - discountAmount;
  
  // Calculate tax amount (default to 0 if tax is not provided)
  const taxRate = item.tax !== undefined ? item.tax / 100 : 0;
  const taxAmount = amountBeforeTax * taxRate;
  
  // Calculate final amount including tax
  const amount = amountBeforeTax + taxAmount;
  
  return {
    subtotal,
    discountAmount,
    amountBeforeTax,
    amount,
    taxAmount
  };
};

/**
 * Calculate document summary including subtotal, discount, tax, and total
 */
export const calculateDocumentSummary = (items: QuotationItem[]): QuotationSummary => {
  const initialSummary: QuotationSummary = {
    subtotal: 0,
    discount: 0,
    tax: 0,
    total: 0
  };

  if (!items.length) return initialSummary;

  return items.reduce((acc, item) => {
    const { subtotal, discountAmount, amountBeforeTax, taxAmount } = calculateItemAmounts(item);
    
    return {
      subtotal: acc.subtotal + subtotal,
      discount: acc.discount + discountAmount,
      tax: acc.tax + taxAmount,
      total: acc.total + amountBeforeTax + taxAmount
    };
  }, initialSummary);
};

/**
 * Update item with calculated amounts
 */
export const updateItemWithCalculations = <T extends BaseItem>(item: T): T & CalculatedItem => {
  const calculations = calculateItemAmounts(item);
  return {
    ...item,
    ...calculations
  };
};

/**
 * Handle field updates that affect calculations
 */
export const handleCalculatedFieldUpdate = <T extends BaseItem>(
  currentItem: T,
  field: keyof T,
  value: any
): T & Partial<CalculatedItem> => {
  // If the field affects calculations, return updated item with new calculations
  if (['quantity', 'unitPrice', 'discount', 'discountType', 'tax'].includes(field as string)) {
    const updatedItem = {
      ...currentItem,
      [field]: value
    };
    return updateItemWithCalculations(updatedItem);
  }
  
  // For non-calculation fields, just update the value
  return {
    ...currentItem,
    [field]: value
  };
};
