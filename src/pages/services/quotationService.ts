import { DocumentData, DocumentPayload } from "@/types/document";
import { apiService } from "./apiService";

/**
 * Convert DocumentData to DocumentPayload for API calls
 */
function convertToDocumentPayload(data: DocumentData): DocumentPayload {
  return {
    ...data,
    items: data.items.map((item) => {
      // If the item already has product_name and unit_price (from DocumentForm mapping), use them
      if ("product_name" in item && "unit_price" in item) {
        return {
          product_id: item.product_id || item.productId || null,
          product_name:
            item.product_name || item.productTitle || item.description || "-",
          unit: item.unit || "",
          quantity: item.quantity || 1,
          unit_price: item.unit_price || item.unitPrice || 0,
          amount: item.amount || 0,
          description: item.description || "",
          amount_before_tax:
            item.amount_before_tax || item.amountBeforeTax || 0,
          discount: item.discount || 0,
          discount_type: item.discount_type || item.discountType || "thb",
          tax: item.tax || 0,
          tax_amount: item.tax_amount || item.taxAmount || 0,
          withholding_tax_amount:
            item.withholding_tax_amount || item.withholdingTaxAmount || 0,
          withholding_tax_option: item.withholding_tax_option || "ไม่ระบุ",
        };
      }

      // Fallback to original mapping for backward compatibility
      return {
        product_id: item.productId || null,
        product_name: item.productTitle || item.description || "-", // fallback
        unit: item.unit || "",
        quantity: item.quantity || 1,
        unit_price: item.unitPrice || item.amount || 0, // fallback
        amount: item.amount || 0,
        description: item.description || "",
        amount_before_tax: item.amountBeforeTax || 0,
        discount: item.discount || 0,
        discount_type: item.discountType || "thb",
        tax: item.tax || 0,
        tax_amount: item.taxAmount || 0,
        withholding_tax_amount:
          item.withholding_tax_amount || item.withholdingTaxAmount || 0,
        withholding_tax_option: item.withholding_tax_option || "ไม่ระบุ",
      };
    }),
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
