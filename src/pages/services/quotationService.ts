import { DocumentData, DocumentPayload } from "@/types/document";
import { apiService } from "./apiService";

/**
 * Convert DocumentData to DocumentPayload for API calls
 */
function convertToDocumentPayload(data: DocumentData): DocumentPayload {
  return {
    ...data,
    items: data.items.map((item) => ({
      product_id: item.productId || null,
      product_name: item.productTitle || item.description || "-", // fallback
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unitPrice || item.amount || 0, // fallback
      amount: item.amount,
      description: item.description,
      amount_before_tax: item.amountBeforeTax,
      discount: item.discount,
      discount_type: item.discountType,
      tax: item.tax,
      tax_amount: item.taxAmount || 0,
      withholding_tax_amount:
        item.withholding_tax_amount || item.withholdingTaxAmount || 0,
      withholding_tax_option: item.withholding_tax_option,
    })),
    priceType: data.priceType,
  };
}

const createQuotation = async (data: DocumentData): Promise<DocumentData> => {
  const payload = convertToDocumentPayload(data);
  const result = await apiService.createDocument({
    ...payload,
    documentType: "quotation",
  });
  // ลบการ syncDocumentsToLocalStorage
  return result;
};

const updateQuotation = async (
  id: string,
  data: DocumentData
): Promise<DocumentData> => {
  const payload = convertToDocumentPayload(data);
  const result = await apiService.updateDocument(id, payload);
  // ลบการ syncDocumentsToLocalStorage
  return result;
};

const deleteQuotation = async (id: string): Promise<void> => {
  await apiService.deleteDocument(id);
  // ลบการ syncDocumentsToLocalStorage
};

export const quotationService = {
  createQuotation,
  updateQuotation,
  deleteQuotation,
};
