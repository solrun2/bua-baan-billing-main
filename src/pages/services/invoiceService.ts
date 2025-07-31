import { DocumentData, DocumentPayload } from "@/types/document";
import { apiService } from "./apiService";
import { documentService } from "./documentService";

/**
 * Convert DocumentData to DocumentPayload for API calls
 */
function convertToDocumentPayload(data: DocumentData): DocumentPayload {
  return {
    ...data,
    items: data.items.map((item) => {
      // If the item already has product_name and unit_price (from DocumentForm mapping), use them
      if ("product_name" in item && "unit_price" in item) {
        const itemWithBackendFields = item as any;
        return {
          product_id:
            itemWithBackendFields.product_id || item.productId || null,
          product_name:
            itemWithBackendFields.product_name ||
            item.productTitle ||
            item.description ||
            "-",
          unit: item.unit || "",
          quantity: item.quantity || 1,
          unit_price: itemWithBackendFields.unit_price || item.unitPrice || 0,
          amount: item.amount || 0,
          description: item.description || "",
          amount_before_tax:
            itemWithBackendFields.amount_before_tax ||
            item.amountBeforeTax ||
            0,
          discount: item.discount || 0,
          discount_type:
            itemWithBackendFields.discount_type || item.discountType || "thb",
          tax: item.tax || 0,
          tax_amount: itemWithBackendFields.tax_amount || item.taxAmount || 0,
          withholding_tax_amount:
            itemWithBackendFields.withholding_tax_amount ||
            item.withholdingTaxAmount ||
            0,
          withholding_tax_option:
            itemWithBackendFields.withholding_tax_option || "ไม่ระบุ",
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

/**
 * Create a new invoice
 * @param data Invoice data
 * @returns Promise with the created invoice
 */
export const createInvoice = async (
  data: DocumentData
): Promise<DocumentData> => {
  try {
    console.log("[DEBUG] invoiceService.createInvoice - input data:", {
      itemsCount: data.items?.length,
      firstItem: data.items?.[0]
        ? {
            productId: data.items[0].productId,
            productTitle: data.items[0].productTitle,
            product_name: (data.items[0] as any).product_name,
            unitPrice: data.items[0].unitPrice,
            unit_price: (data.items[0] as any).unit_price,
            description: data.items[0].description,
          }
        : null,
    });

    // Convert to DocumentPayload for API
    const payload = convertToDocumentPayload(data);

    console.log("[DEBUG] invoiceService.createInvoice - converted payload:", {
      itemsCount: payload.items?.length,
      firstItem: payload.items?.[0]
        ? {
            product_id: payload.items[0].product_id,
            product_name: payload.items[0].product_name,
            unit_price: payload.items[0].unit_price,
            description: payload.items[0].description,
          }
        : null,
    });

    // First save to API
    const invoice = await apiService.createDocument(payload);

    // Then save to local storage
    documentService.save(invoice);

    return invoice;
  } catch (error) {
    console.error("Error creating invoice:", error);
    // If API fails, try to save to local storage as fallback
    const localInvoice = documentService.save(data);
    return localInvoice;
  }
};

/**
 * Update an existing invoice
 * @param id Invoice ID
 * @param data Updated invoice data
 * @returns Promise with the updated invoice
 */
export const updateInvoice = async (
  id: string,
  data: DocumentData
): Promise<DocumentData> => {
  try {
    console.log("[DEBUG] invoiceService.updateInvoice - input data:", {
      id,
      itemsCount: data.items?.length,
      firstItem: data.items?.[0] ? {
        productId: data.items[0].productId,
        productTitle: data.items[0].productTitle,
        product_name: (data.items[0] as any).product_name,
        unitPrice: data.items[0].unitPrice,
        unit_price: (data.items[0] as any).unit_price,
        description: data.items[0].description,
      } : null
    });
    
    // Convert to DocumentPayload for API
    const payload = convertToDocumentPayload(data);
    
    console.log("[DEBUG] invoiceService.updateInvoice - converted payload:", {
      itemsCount: payload.items?.length,
      firstItem: payload.items?.[0] ? {
        product_id: payload.items[0].product_id,
        product_name: payload.items[0].product_name,
        unit_price: payload.items[0].unit_price,
        description: payload.items[0].description,
      } : null
    });

    // First update in API
    const updatedInvoice = await apiService.updateDocument(id, payload);

    // Then update in local storage
    documentService.save(updatedInvoice);

    return updatedInvoice;
  } catch (error) {
    console.error("Error updating invoice:", error);
    // If API fails, try to update in local storage as fallback
    const localInvoice = documentService.save({
      ...data,
      id, // Ensure ID is set
      updatedAt: new Date().toISOString(),
    });
    return localInvoice;
  }
};

/**
 * Get an invoice by ID
 * @param id Invoice ID
 * @returns Promise with the invoice data
 */
export const getInvoice = async (id: string): Promise<DocumentData | null> => {
  try {
    // First try to get from API
    const documents = await apiService.getDocuments();
    const doc = documents.find((d) => {
      const documentId = String(d.id);
      return documentId === id && d.document_type === "INVOICE";
    });

    if (doc) {
      // Map the Document to DocumentData
      const invoice: DocumentData = {
        id: String(doc.id),
        documentType: "invoice",
        documentNumber: doc.document_number,
        documentDate: doc.issue_date,
        dueDate: doc.due_date || "",
        reference: doc.document_number, // Using document number as reference if not available
        priceType: "INCLUDE_VAT", // Defaulting to INCLUDE_VAT pricing
        customer: {
          id: doc.id, // Note: This might need adjustment based on your data model
          name: doc.customer_name,
          tax_id: "", // These fields might need to be populated from your API
          phone: doc.customer_phone || "",
          address: doc.customer_address || "",
        },
        items:
          doc.items?.map((item) => ({
            ...item,
            id: item.id || Math.random().toString(36).substring(2, 9), // Generate ID if not present
            productId: item.productId || "",
            productTitle: item.productTitle || "Untitled Item",
            description: item.description || "",
            unit: item.unit || "ชิ้น",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            priceType: item.priceType || "INCLUDE_VAT",
            discount: item.discount || 0,
            discountType: item.discountType || "thb",
            tax: item.tax || 0,
            amountBeforeTax: item.amountBeforeTax || 0,
            withholdingTax: item.withholdingTax || 0,
            amount: item.amount || 0,
            isEditing: false,
          })) || [],
        summary: {
          subtotal: doc.total_amount || 0,
          discount: 0, // These might need to be calculated or retrieved from the API
          tax: 0,
          total: doc.total_amount || 0,
          withholdingTax: 0,
        },
        notes: "", // Notes not available in the Document type
        status: doc.status || "รอชำระ",
      };

      // Save to local storage for offline access
      documentService.save(invoice);
      return invoice;
    }
  } catch (error) {
    console.error("Error fetching invoice from API:", error);
    // Fallback to local storage if API fails
    return documentService.getById(id);
  }

  return null;
};

export const getInvoices = async (): Promise<DocumentData[]> => {
  try {
    // First try to get from API
    const documents = await apiService.getDocuments();
    const invoices = documents
      .filter((doc) => doc.document_type === "INVOICE")
      .map((doc) => {
        const documentData: DocumentData = {
          id: doc.id?.toString(),
          documentType: doc.document_type.toLowerCase() as
            | "quotation"
            | "invoice"
            | "receipt"
            | "tax_invoice",
          customer: {
            name: doc.customer_name,
            tax_id: "",
            phone: doc.customer_phone || "",
            address: doc.customer_address || "",
          },
          items: doc.items || [],
          summary: {
            subtotal: doc.total_amount,
            discount: 0,
            tax: 0,
            total: doc.total_amount,
            withholdingTax: 0,
          },
          notes: "",
          documentNumber: doc.document_number,
          documentDate: doc.issue_date,
          priceType: "INCLUDE_VAT",
          reference: "",
          status: doc.status || "รอชำระ",
          validUntil: doc.due_date || "",
        };
        return documentData;
      });

    // Save all to local storage for offline access
    if (invoices.length > 0) {
      invoices.forEach((doc) => documentService.save(doc));
    }

    return invoices;
  } catch (error) {
    console.error("Error fetching invoices from API:", error);
    // Fallback to local storage if API fails
    const allDocuments = documentService.getAll();
    return allDocuments.filter((doc) => doc.documentType === "invoice");
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    // First delete from API
    await apiService.deleteDocument(id);
  } catch (error) {
    console.error("Error deleting invoice from API:", error);
    // Continue to delete from local storage even if API fails
  }

  // Always delete from local storage
  documentService.deleteById(id);
};

export const invoiceService = {
  createInvoice,
  updateInvoice,
  getInvoice,
  getInvoices,
  deleteInvoice,
};

export default invoiceService;
