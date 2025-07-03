export const generateDocumentNumber = (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice",
  existingNumbers: string[] = []
): string => {
  const prefixMap = {
    quotation: "QT",
    invoice: "IV",
    receipt: "RC",
    tax_invoice: "TAX",
  };

  const prefix = prefixMap[type] || "DOC";
  const year = new Date().getFullYear();

  // Create a regex that matches the exact document type prefix
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxNumber = 0;

  // Process only numbers that match the current document type
  existingNumbers.forEach((num) => {
    if (!num || typeof num !== "string") return;

    const match = num.trim().match(regex);
    if (match && match[1]) {
      const currentNum = parseInt(match[1], 10);
      if (!isNaN(currentNum) && currentNum > maxNumber) {
        maxNumber = currentNum;
      }
    }
  });

  // Increment the max number and format with 4 leading zeros
  const nextNumber = (maxNumber + 1).toString().padStart(4, "0");
  const newDocumentNumber = `${prefix}-${year}-${nextNumber}`;

  return newDocumentNumber;
};

/**
 * Generates a document number for the client-side when server-side checking isn't needed
 * This is a simpler version that just uses timestamp for uniqueness
 */
export const generateClientDocumentNumber = (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice"
): string => {
  const prefixMap = {
    quotation: "QT",
    invoice: "IV",
    receipt: "RC",
    tax_invoice: "TAX",
  };

  const prefix = prefixMap[type] || "DOC";
  const year = new Date().getFullYear();
  // For client-side, generate a temporary number that will be replaced on server-side
  return `${prefix}-${year}-0001`;
};

/**
 * คำนวณ summary (subtotal, discount, tax, total, withholdingTax) จาก items
 */
export function calculateSummaryFromItems(items: any[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let tax = 0;
  let total = 0;
  let withholdingTaxTotal = 0;
  items.forEach((item) => {
    const qty = Number((item.quantity ?? 1).toString().replace(/,/g, ""));
    const unitPrice = Number(
      (item.unitPrice ?? item.unit_price ?? 0).toString().replace(/,/g, "")
    );
    const discount = Number((item.discount ?? 0).toString().replace(/,/g, ""));
    const discountType = item.discount_type ?? item.discountType ?? "thb";
    const itemSubtotal = unitPrice * qty;
    let itemDiscount = 0;
    if (discountType === "percentage") {
      itemDiscount = itemSubtotal * (discount / 100);
    } else {
      itemDiscount = discount * qty;
    }
    const amountBeforeTax = itemSubtotal - itemDiscount;
    const itemTaxRate = Number((item.tax ?? 0).toString().replace(/,/g, ""));
    const itemTax = amountBeforeTax * (itemTaxRate / 100);
    subtotal += itemSubtotal;
    discountTotal += itemDiscount;
    tax += itemTax;
    total += amountBeforeTax + itemTax;
    // Withholding tax (support both camelCase and snake_case)
    const wht = Number(
      (item.withholdingTaxAmount ?? item.withholding_tax_amount ?? 0)
        .toString()
        .replace(/,/g, "")
    );
    withholdingTaxTotal += wht;
  });
  return {
    subtotal,
    discount: discountTotal,
    tax,
    total,
    withholdingTax: withholdingTaxTotal,
  };
}
