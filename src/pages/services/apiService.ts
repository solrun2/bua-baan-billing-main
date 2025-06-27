import { Customer } from "@/types/customer";
import axios from "axios";
import { Document, DocumentData } from "@/types/document";

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
  const baseData = {
    customer_id: document.customer.id,
    document_type: document.documentType.toUpperCase(),
    document_number: document.documentNumber, // Add document number to the data sent to backend
    status: document.status,
    issue_date: document.documentDate,
    notes: document.notes,
    items: document.items,
    summary: document.summary,
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
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document),
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

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  syncDocumentsToLocalStorage,
  getDocumentNumbers,
  createCustomer,
  // getProducts, createProduct, updateProduct are now in productService.ts
  uploadImage,
};
