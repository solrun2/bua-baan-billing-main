import { DocumentSummary } from "@/types/document";

interface BaseItem {
  quantity: number;
  unitPrice: number;
  priceType: "inclusive" | "exclusive" | "none";
  discount: number;
  discountType: "thb" | "percentage";
  tax?: number;
  withholdingTax?: number | "custom";
  customWithholdingTaxAmount?: number;
}

export interface CalculatedItem {
  subtotal: number;
  discountAmount: number;
  amountBeforeTax: number;
  amount: number;
  taxAmount: number;
  withholdingTaxAmount: number;
}

/**
 * Calculate item amounts including subtotal, discount, tax, and total
 */
export const calculateItemAmounts = (item: BaseItem): CalculatedItem => {
  const taxRate = item.tax !== undefined ? item.tax / 100 : 0;
  const withholdingTaxRate =
    typeof item.withholdingTax === "number" && item.withholdingTax > 0
      ? item.withholdingTax / 100
      : 0;

  let priceBeforeTaxPerUnit = item.unitPrice;
  let effectiveTaxRate = taxRate;
  let itemTax = 0;

  // ปรับ logic ตาม priceType
  if (item.priceType === "inclusive") {
    // ราคานี้รวม VAT แล้ว ต้องคำนวณ tax ย้อนกลับ
    priceBeforeTaxPerUnit = item.unitPrice / (1 + taxRate);
    itemTax = item.unitPrice - priceBeforeTaxPerUnit;
    effectiveTaxRate = taxRate;
  } else if (item.priceType === "none") {
    // ไม่มี VAT
    priceBeforeTaxPerUnit = item.unitPrice;
    itemTax = 0;
    effectiveTaxRate = 0;
  } else {
    // exclusive
    priceBeforeTaxPerUnit = item.unitPrice;
    itemTax = priceBeforeTaxPerUnit * taxRate;
    effectiveTaxRate = taxRate;
  }

  // Calculate subtotal from the (potentially adjusted) unit price
  const subtotal = item.quantity * priceBeforeTaxPerUnit;

  // Calculate discount amount based on discount type
  const discountAmount =
    item.discountType === "percentage"
      ? (subtotal * item.discount) / 100
      : item.discount * item.quantity;

  // Calculate amount before tax
  const amountBeforeTax = subtotal - discountAmount;

  // Calculate tax amount from the amount after discount, but only if priceType is not 'none'
  const taxAmount = item.priceType === "none" ? 0 : amountBeforeTax * taxRate;

  // Calculate withholding tax amount for the item
  let withholdingTaxAmount = 0;
  if (item.withholdingTax === "custom") {
    withholdingTaxAmount = item.customWithholdingTaxAmount || 0;
  } else {
    withholdingTaxAmount = amountBeforeTax * withholdingTaxRate;
  }

  // Calculate final amount including tax
  const amount = amountBeforeTax + taxAmount;

  return {
    subtotal,
    discountAmount,
    amountBeforeTax,
    amount,
    taxAmount,
    withholdingTaxAmount,
  };
};

export interface DocumentSummary {
  subtotal: number; // มูลค่าก่อนภาษี (ยังไม่หักส่วนลด)
  discount: number; // ส่วนลดรวม
  netAfterDiscount: number; // มูลค่าหลังหักส่วนลด
  tax: number; // VAT
  total: number; // รวมเป็นเงิน
}

/**
 * Calculate document summary including subtotal, discount, tax, and total
 */
export const calculateDocumentSummary = <T extends BaseItem>(
  items: T[],
  priceType: "inclusive" | "exclusive" | "none" = "exclusive"
): DocumentSummary => {
  let subtotal = 0;
  let discountTotal = 0;
  let netAfterDiscount = 0;

  for (const item of items) {
    const quantity = Number(item.quantity ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
    const discount = Number(item.discount ?? 0);
    const discountType = item.discountType ?? item.discount_type ?? "thb";
    const discountAmount =
      discountType === "percentage"
        ? unitPrice * quantity * (discount / 100)
        : discount * quantity;

    subtotal += unitPrice * quantity;
    discountTotal += discountAmount;
    // netAfterDiscount = ผลรวม (ราคาต่อหน่วย - ส่วนลด/หน่วย) × จำนวน
    netAfterDiscount +=
      (unitPrice -
        (discountType === "percentage"
          ? unitPrice * (discount / 100)
          : discount)) *
      quantity;
  }

  const firstTaxRate = items.length > 0 ? Number(items[0].tax ?? 0) / 100 : 0;

  let summarySubtotal = subtotal;
  let tax = 0;
  let total = 0;

  if (priceType === "inclusive" && firstTaxRate > 0) {
    // รวม VAT แล้ว: มูลค่าก่อนภาษี = netAfterDiscount / (1 + VAT)
    summarySubtotal = netAfterDiscount / (1 + firstTaxRate);
    tax = netAfterDiscount - summarySubtotal;
    total = netAfterDiscount;
  } else if (priceType === "exclusive" && firstTaxRate > 0) {
    summarySubtotal = subtotal;
    tax = (subtotal - discountTotal) * firstTaxRate;
    total = subtotal - discountTotal + tax;
  } else {
    summarySubtotal = subtotal;
    tax = 0;
    total = subtotal - discountTotal;
  }

  return {
    subtotal: summarySubtotal,
    discount: discountTotal,
    netAfterDiscount,
    tax,
    total,
  };
};

/**
 * Update item with calculated amounts
 */
export const updateItemWithCalculations = <T extends BaseItem>(
  item: T
): T & CalculatedItem => {
  const calculations = calculateItemAmounts(item);
  return {
    ...item,
    ...calculations,
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
  if (
    [
      "quantity",
      "unitPrice",
      "priceType",
      "discount",
      "discountType",
      "tax",
      "withholdingTax",
    ].includes(field as string)
  ) {
    const updatedItem = {
      ...currentItem,
      [field]: value,
    };
    return updateItemWithCalculations(updatedItem);
  }

  // For non-calculation fields, just update the value
  return {
    ...currentItem,
    [field]: value,
  };
};
