import { Customer } from "@/types/customer";
import axios from "axios";
import { Document, DocumentData, DocumentPayload } from "@/types/document";

const API_BASE_URL = "http://localhost:3001/api";

// ... (โค้ดส่วนอื่นๆ ของไฟล์ apiService.ts ยังคงเหมือนเดิม)

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

const createDocument = async (
  document: DocumentPayload
): Promise<DocumentData> => {
  // map field ให้ตรง backend
  const backendData = prepareDocumentData(document);
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
    const createdDoc = await response.json();
    return mapDocumentFromBackend(createdDoc);
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
};

// ย้ายฟังก์ชัน prepareDocumentData ให้อยู่เหนือ updateDocument (ถ้ายังไม่ได้อยู่)
function prepareDocumentData(document: DocumentPayload): any {
  return {
    id: document.id,
    document_type: document.documentType,
    document_number: document.documentNumber,
    issue_date: document.documentDate,
    due_date: document.dueDate,
    valid_until: document.validUntil,
    reference: document.reference || "",
    customer: document.customer,
    items: Array.isArray(document.items) ? document.items : [],
    summary: document.summary,
    notes: document.notes,
    priceType: document.priceType,
    status: document.status,
    attachments: document.attachments,
    tags: document.tags,
    updatedAt: document.updatedAt,
    issueTaxInvoice: document.issueTaxInvoice,
    // เพิ่ม field อื่น ๆ ที่ backend ต้องการ
  };
}

// --- จุดที่แก้ไข ---
// เปลี่ยนประเภทของพารามิเตอร์ document จาก DocumentData เป็น DocumentPayload
const updateDocument = async (
  id: string,
  document: DocumentPayload
): Promise<DocumentData> => {
  try {
    const backendData = prepareDocumentData(document);
    console.log("[updateDocument] backendData:", backendData); // <--- log payload ที่จะส่งไป
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendData),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("[updateDocument] errorData:", errorData); // <--- log error ที่ได้จาก backend
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

const getDocumentNumbers = async (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice"
): Promise<string[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/documents/next-number?type=${type}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch next document number");
    }
    const data = await response.json();
    return data.documentNumber;
  } catch (error) {
    console.error("Error fetching document numbers:", error);
    return [];
  }
};

function mapDocumentFromBackend(doc: any): DocumentData {
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr || typeof dateStr !== "string") {
      return "";
    }
    return dateStr.substring(0, 10);
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
    related_document_id: doc.related_document_id,
    items: (doc.items || []).map((item: any) => ({
      id: item.id?.toString() ?? `item-${Date.now()}`,
      productId: item.product_id?.toString() ?? "",
      productTitle: item.product_name ?? "",
      description: item.description ?? "",
      unit: item.unit ?? "",
      quantity: Number(item.quantity ?? 1),
      unitPrice: Number(item.unit_price ?? 0),
      priceType: doc.price_type || "exclusive",
      discount: Number(item.discount ?? 0),
      discountType: item.discount_type ?? "thb",
      tax: Number(item.tax ?? 0),
      amountBeforeTax: Number(item.amount_before_tax ?? 0),
      withholdingTax:
        typeof item.withholding_tax_option === "string" &&
        item.withholding_tax_option.endsWith("%")
          ? parseFloat(item.withholding_tax_option)
          : Number(item.withholding_tax_option) || -1,
      customWithholdingTaxAmount: Number(
        item.custom_withholding_tax_amount ?? 0
      ),
      amount: Number(item.amount ?? 0),
      isEditing: false,
      taxAmount: Number(item.tax_amount ?? 0),
      withholdingTaxAmount: Number(item.withholding_tax_amount ?? 0),
      withholding_tax_option: item.withholding_tax_option ?? "ไม่ระบุ",
    })),
    items_recursive: doc.items_recursive || [],
    summary: doc.summary || {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      withholdingTax: 0,
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

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentNumbers,
  createCustomer,
  uploadImage,
  getDocumentById,
};
