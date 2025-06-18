import { Item } from "../types/item";

export function getWithholdingTaxValue(item: Item) {
  if (item.withholdingTax === "custom" && item.customWithholdingTax) {
    return parseFloat(item.customWithholdingTax) || 0;
  }
  if (item.withholdingTax === "not_specified") return 0;
  return parseFloat(item.withholdingTax) || 0;
}

export function calcSubtotal(items: Item[], priceType: string) {
  return items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price - item.discount;
    if (item.vat > 0) {
      if (priceType === "include_tax") {
        const vatRate = item.vat / 100;
        const preTax = itemTotal / (1 + vatRate);
        return sum + preTax;
      }
      return sum + itemTotal;
    }
    return sum + itemTotal;
  }, 0);
}

export function calcVatAmount(items: Item[], priceType: string) {
  return items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price - item.discount;
    let preTax = itemTotal;
    if (item.vat > 0 && priceType === "include_tax") {
      const vatRate = item.vat / 100;
      preTax = itemTotal / (1 + vatRate);
    }
    return sum + preTax * (item.vat > 0 ? item.vat / 100 : 0);
  }, 0);
}

export function calcWithholding(items: Item[]) {
  return items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price - item.discount;
    return sum + (itemTotal * getWithholdingTaxValue(item)) / 100;
  }, 0);
}

export function calcGrandTotal(subtotal: number, vatAmount: number, totalWithholding: number) {
  return subtotal + vatAmount - totalWithholding;
}
