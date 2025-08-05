import { Customer } from "@/types/customer";
import axios from "axios";
import { Document, DocumentData, DocumentPayload } from "@/types/document";

const API_BASE_URL = "http://localhost:3001/api";

// ... (โค้ดส่วนอื่นๆ ของไฟล์ apiService.ts ยังคงเหมือนเดิม)

interface PaginationParams {
  page?: number;
  limit?: number;
  document_type?: string;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface PaginationResponse {
  documents: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const getDocuments = async (
  params?: PaginationParams
): Promise<PaginationResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.page) queryParams.append("page", params.page.toString());
      if (params.limit) queryParams.append("limit", params.limit.toString());
      if (params.document_type)
        queryParams.append("document_type", params.document_type);
      if (params.status) queryParams.append("status", params.status);
      if (params.search) queryParams.append("search", params.search);
      if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);
      if (params.dateTo) queryParams.append("dateTo", params.dateTo);
    }

    const url = `${API_BASE_URL}/documents${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to fetch documents");
    }
    const data = await response.json();

    if (!data.documents || !Array.isArray(data.documents)) {
      console.error("API response for documents is invalid:", data);
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
  const backendData = {
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
    // เพิ่ม fields สำหรับ receipt
    payment_date: document.payment_date,
    payment_method: document.payment_method,
    payment_reference: document.payment_reference,
    payment_channels: document.payment_channels,
    fees: document.fees,
    offset_docs: document.offset_docs,
    net_total_receipt: document.net_total_receipt,
  };

  // Debug log สำหรับ receipt
  if (document.documentType === "receipt") {
    console.log("[prepareDocumentData] Receipt fields:");
    console.log("- payment_date:", backendData.payment_date);
    console.log("- payment_method:", backendData.payment_method);
    console.log("- payment_channels:", backendData.payment_channels);
    console.log("- fees:", backendData.fees);
    console.log("- offset_docs:", backendData.offset_docs);
    console.log("- net_total_receipt:", backendData.net_total_receipt);
  }

  return backendData;
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

const cancelDocument = async (
  id: string
): Promise<{
  message: string;
  cancelledDocument: any;
  relatedDocumentsCancelled: number;
}> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}/cancel`, {
      method: "PUT",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to cancel document");
    }
    return await response.json();
  } catch (error) {
    console.error(`Error cancelling document with id ${id}:`, error);
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
    // แปลงเป็น YYYY-MM-DD (local date)
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.substring(0, 10);
    // local date (timezone browser)
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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
      subtotal: Number(doc.subtotal ?? 0),
      discount: 0,
      tax: Number(doc.tax_amount ?? 0),
      total: Number(doc.total_amount ?? 0),
      withholdingTax: 0,
    },
    attachments: doc.attachments || [],
    issueTaxInvoice: doc.issue_tax_invoice ?? false,
    updatedAt: doc.updated_at,
    // เพิ่ม receipt_details
    receipt_details: doc.receipt_details || null,
  };
}

const getDocumentById = async (id: string): Promise<DocumentData> => {
  console.log("[DEBUG] getDocumentById - Requested ID:", id);
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`);

    if (!response.ok) {
      throw new Error("Failed to fetch document by ID");
    }
    const doc = await response.json();

    // Debug log เพื่อตรวจสอบข้อมูลที่ได้จาก backend
    console.log("[DEBUG] getDocumentById - raw doc from backend:", {
      id: doc.id,
      document_number: doc.document_number,
      document_type: doc.document_type,
    });

    const mappedDoc = mapDocumentFromBackend(doc);

    // Debug log เพื่อตรวจสอบข้อมูลหลังแปลง
    console.log("[DEBUG] getDocumentById - mapped doc:", {
      id: mappedDoc.id,
      documentNumber: mappedDoc.documentNumber,
      documentType: mappedDoc.documentType,
      receipt_details: mappedDoc.receipt_details,
    });

    return mappedDoc;
  } catch (error) {
    console.error("Error fetching document by ID:", error);
    throw error;
  }
};

// เพิ่ม generic HTTP methods
const get = async (endpoint: string): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error in GET ${endpoint}:`, error);
    throw error;
  }
};

const post = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error in POST ${endpoint}:`, error);
    throw error;
  }
};

const put = async (endpoint: string, data: any): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }
    return await response.json();
  } catch (error) {
    console.error(`Error in PUT ${endpoint}:`, error);
    throw error;
  }
};

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  cancelDocument,
  getDocumentNumbers,
  createCustomer,
  uploadImage,
  getDocumentById,
  get,
  post,
  put,
};
