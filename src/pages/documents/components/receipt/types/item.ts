export interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  vat: number;
  withholdingTax: string;
  customWithholdingTax?: string;
  description: string;
}
