import { Customer } from "@/types/customer";
import axios from "axios";
import { Document, DocumentData } from "@/types/document";
import { DocumentItem } from "@/types/document";
import { Product } from "@/types/product";
import { updateItemWithCalculations } from "@/calculate/documentCalculations";

const API_BASE_URL = "http://localhost:3001/api";

const getDocuments = async (): Promise<Document[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error("Failed to fetch documents");
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error("API response for documents is not an array:", data);
      throw new Error("Received invalid data format for documents.");
    }
    return data;
  } catch (error) {
    console.error("Error fetching documents:", error);
    throw error;
  }
};

const prepareDocumentData = (document: DocumentData): any => {
  // เตรียมข้อมูล customer object ให้ครบ id, name
  const customer =
    document.customer && document.customer.id && document.customer.name
      ? {
          id: document.customer.id,
          name: document.customer.name,
          tax_id: document.customer.tax_id || "",
          phone: document.customer.phone || "",
          address: document.customer.address || "",
          email: document.customer.email || "",
        }
      : undefined;

  // เตรียม items array ให้ตรงกับ backend
  const items = (document.items || []).map((item) => ({
    product_id: item.productId ?? (item as any).product_id ?? "",
    product_name: item.productTitle ?? (item as any).product_name ?? "",
    unit: item.unit ?? "",
    quantity: Number(item.quantity ?? 1),
    unit_price: Number(item.unitPrice ?? (item as any).unit_price ?? 0),
    amount: Number(item.amount ?? 0),
    description: item.description ?? "",
    withholding_tax_amount: Number(
      item.withholdingTaxAmount ?? (item as any).withholding_tax_amount ?? 0
    ),
    withholding_tax_option:
      item.withholdingTax ?? (item as any).withholding_tax_option ?? -1,
    amount_before_tax: Number(
      item.amountBeforeTax ?? (item as any).amount_before_tax ?? 0
    ),
    discount: Number(item.discount ?? 0),
    discount_type: item.discountType ?? (item as any).discount_type ?? "thb",
    tax: Number(item.tax ?? 0),
    tax_amount: Number(item.taxAmount ?? (item as any).tax_amount ?? 0),
  }));

  // Log discount_type and discount for each item before sending to backend
  if (items.length > 0) {
    console.log(
      "[prepareDocumentData] items to backend:",
      items.map((i) => ({
        discount_type: i.discount_type,
        discount: i.discount,
        product_name: i.product_name,
      }))
    );
  }

  // Ensure summary fields are always present
  const summary: any = document.summary || {};
  const safeSummary = {
    subtotal: typeof summary.subtotal === "number" ? summary.subtotal : 0,
    discount: typeof summary.discount === "number" ? summary.discount : 0,
    tax: typeof summary.tax === "number" ? summary.tax : 0,
    total: typeof summary.total === "number" ? summary.total : 0,
    withholdingTax:
      typeof summary.withholdingTax === "number" ? summary.withholdingTax : 0,
  };

  const baseData = {
    customer, // object
    document_type: document.documentType
      ? document.documentType.toUpperCase()
      : "",
    document_number: document.documentNumber, // Add document number to the data sent to backend
    status: document.status,
    issue_date: document.documentDate,
    notes: document.notes,
    items,
    summary: safeSummary,
  };

  if (document.documentType === "quotation") {
    return {
      ...baseData,
      valid_until: document.validUntil,
    };
  } else if (document.documentType === "invoice") {
    return {
      ...baseData,
      due_date: document.dueDate,
    };
  }

  return baseData;
};

const createDocument = async (
  document: DocumentData
): Promise<DocumentData> => {
  const backendData = prepareDocumentData(document);

  console.log("[createDocument] backendData:", backendData);

  try {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create document");
    }

    const createdDocFromBackend = await response.json();

    // Reconstruct the full DocumentData object to ensure consistency
    const finalDocumentData: DocumentData = {
      ...document, // all properties from the original form data
      id: createdDocFromBackend.id.toString(), // override with the new ID from the backend
      documentNumber: createdDocFromBackend.document_number, // and the new document number
      // The 'customer' object is preserved from the original 'document'
    };

    return finalDocumentData;
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
};

const updateDocument = async (
  id: string,
  document: DocumentData
): Promise<DocumentData> => {
  try {
    const backendData = prepareDocumentData(document);
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to update document");
    }
    return await response.json();
  } catch (error) {
    console.error("Error updating document:", error);
    throw error;
  }
};

const deleteDocument = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to delete document");
    }
  } catch (error) {
    console.error(`Error deleting document with id ${id}:`, error);
    throw error;
  }
};

const createCustomer = async (
  customer: Omit<Customer, "id">
): Promise<{ customer: Customer; customers: Customer[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });

    const customers = await response.json();

    if (!response.ok) {
      throw new Error(customers.error || "Failed to create customer");
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error("API did not return the expected customer list.");
    }

    const newCustomer = customers.reduce((latest, current) =>
      latest.id > current.id ? latest : current
    );

    return { customer: newCustomer, customers: customers };
  } catch (error) {
    console.error("Error creating customer:", error);
    throw error;
  }
};

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  try {
    const response = await axios.post<{ imageUrl: string }>(
      `${API_BASE_URL}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.imageUrl;
  } catch (error) {
    console.error("Image upload failed:", error);
    throw error;
  }
};

// Sync database documents to localStorage
const syncDocumentsToLocalStorage = async (): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error("Failed to fetch documents for sync");
    }
    const documents = await response.json();

    if (Array.isArray(documents)) {
      // Only store document numbers to keep localStorage small
      const documentNumbers = documents.map((doc) => ({
        id: doc.id,
        documentNumber: doc.document_number,
        documentType: doc.document_type,
        documentDate: doc.issue_date,
      }));

      localStorage.setItem("documents", JSON.stringify(documentNumbers));
      console.log("Synced documents to localStorage:", documentNumbers);
    }
  } catch (error) {
    console.error("Error syncing documents to localStorage:", error);
  }
};

// Get document numbers directly from the database, filtered by document type
const getDocumentNumbers = async (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice"
): Promise<string[]> => {
  try {
    console.log(`Fetching documents of type: ${type}`);
    const response = await fetch(`${API_BASE_URL}/documents?type=${type}`);
    if (!response.ok) {
      throw new Error("Failed to fetch documents");
    }
    const documents = await response.json();

    if (Array.isArray(documents)) {
      // Extract only the document numbers and filter out any invalid entries
      const numbers = documents
        .map((doc) => doc.document_number)
        .filter((num): num is string => Boolean(num));

      console.log(
        `Found ${numbers.length} documents of type ${type}:`,
        numbers
      );
      return numbers;
    }
    return [];
  } catch (error) {
    console.error("Error fetching document numbers:", error);
    return [];
  }
};

// Map backend document (snake_case) to frontend DocumentData (camelCase)
function mapDocumentFromBackend(doc: any): DocumentData {
  // Helper function to format date as yyyy-MM-dd
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    // Return yyyy-MM-dd
    return d.toISOString().split("T")[0];
  };
  return {
    id: doc.id?.toString(),
    documentType: doc.document_type?.toLowerCase(),
    documentNumber: doc.document_number,
    documentDate: formatDate(doc.issue_date),
    dueDate: formatDate(doc.due_date),
    validUntil: formatDate(doc.valid_until),
    reference: doc.reference,
    status: doc.status,
    priceType: doc.price_type || "exclusive",
    notes: doc.notes,
    tags: doc.tags || [],
    customer: {
      id: doc.customer_id?.toString() ?? "",
      name: doc.customer_name ?? "",
      tax_id: doc.customer_tax_id || "",
      phone: doc.customer_phone || "",
      address: doc.customer_address || "",
      email: doc.customer_email || "",
    },
    related_document_id: doc.related_document_id, // เพิ่มบรรทัดนี้
    items: (doc.items || []).map((item: any) => {
      return {
        id: item.id?.toString() ?? `item-${Date.now()}`,
        productId:
          item.product_id?.toString() ?? item.productId?.toString() ?? "",
        productTitle: item.product_name ?? item.productTitle ?? "",
        description: item.description ?? "",
        unit: item.unit ?? "",
        quantity: Number(item.quantity ?? 1),
        unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
        priceType: doc.price_type || "exclusive",
        discount: Number(item.discount ?? 0),
        discountType: item.discount_type ?? item.discountType ?? "thb",
        tax: Number(item.tax ?? 0),
        amountBeforeTax: Number(
          item.amount_before_tax ?? item.amountBeforeTax ?? 0
        ),
        withholdingTax:
          typeof item.withholdingTax === "number"
            ? item.withholdingTax
            : typeof item.withholding_tax_option === "string" &&
                item.withholding_tax_option.endsWith("%")
              ? parseFloat(item.withholding_tax_option)
              : Number(item.withholding_tax_option ?? -1),
        customWithholdingTaxAmount: Number(
          item.custom_withholding_tax_amount ??
            item.customWithholdingTaxAmount ??
            0
        ),
        amount: Number(item.amount ?? 0),
        isEditing: false,
        taxAmount: Number(item.tax_amount ?? item.taxAmount ?? 0),
        withholdingTaxAmount: Number(
          item.withholding_tax_amount ?? item.withholdingTaxAmount ?? 0
        ),
        withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
      };
    }),
    summary: {
      subtotal: Number(doc.subtotal ?? 0),
      discount: Number(doc.discount ?? 0),
      tax: Number(doc.tax_amount ?? 0),
      total: Number(doc.total_amount ?? 0),
      withholdingTax: Number(doc.withholding_tax ?? 0),
    },
    attachments: doc.attachments || [],
    issueTaxInvoice: doc.issue_tax_invoice ?? false,
    updatedAt: doc.updated_at,
  };
}

const getDocumentById = async (id: string): Promise<DocumentData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`);
    if (!response.ok) {
      throw new Error("Failed to fetch document by ID");
    }
    const doc = await response.json();
    return mapDocumentFromBackend(doc);
  } catch (error) {
    console.error("Error fetching document by ID:", error);
    throw error;
  }
};

const createDefaultItem = (): DocumentItem => ({
  id: `item-${Date.now()}`,
  productTitle: "",
  description: "",
  unit: "",
  quantity: 1,
  unitPrice: 0,
  priceType: "exclusive",
  discount: 0,
  discountType: "thb",
  tax: 7,
  amountBeforeTax: 0,
  withholdingTax: -1,
  amount: 0,
  isEditing: true,
});

const handleProductSelect = (
  product: Product | null,
  itemId: string,
  items: DocumentItem[],
  setItems: (items: DocumentItem[]) => void
) => {
  if (product) {
    const updatedItems = items.map((item) => {
      if (item.id === itemId) {
        // อัปเดตค่าต่างๆ จากสินค้าใหม่
        const newItem = {
          ...item,
          productId: String(product.id),
          productTitle: product.name,
          description: product.description || "",
          unitPrice: product.price || 0,
          unit: product.unit || "ชิ้น",
          tax: product.vat_rate ?? 7, // หรือ field ที่ถูกต้อง
          isEditing: false,
        };
        return updateItemWithCalculations(newItem);
      }
      return item;
    });
    setItems(updatedItems);
  }
};

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  syncDocumentsToLocalStorage,
  getDocumentNumbers,
  createCustomer,
  uploadImage,
  getDocumentById,
};
