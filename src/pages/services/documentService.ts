import { DocumentData } from "@/types/document";
import { generateDocumentNumber } from "@/utils/documentUtils";

const STORAGE_KEY = "documents";

// Helper to get all documents from localStorage
const getDocuments = (): DocumentData[] => {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

// Helper to save all documents to localStorage
const saveDocuments = (documents: DocumentData[]) => {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }
};

// Public service object
export const documentService = {
  clearAll: () => {
    localStorage.removeItem("documents");
    // We might need to reload to reflect the changes in the UI
    window.location.reload();
  },
  getAll: (): DocumentData[] => {
    return getDocuments();
  },
  getById: (id: string): DocumentData | undefined => {
    const documents = getDocuments();
    return documents.find((doc) => doc.id === id);
  },
  save: (data: DocumentData): DocumentData => {
    let documents = getDocuments();
    const existingIndex = documents.findIndex((doc) => doc.id === data.id);

    if (existingIndex > -1) {
      // Update existing document
      documents[existingIndex] = data;
    } else {
      // Add new document
      data.id = data.id || `doc_${Date.now()}`;
      documents.push(data);
    }

    saveDocuments(documents);
    return data;
  },

  // Generate a new document number based on type
  generateNewDocumentNumber(
    type: "quotation" | "invoice" | "receipt" | "tax_invoice"
  ): string {
    // ใช้ cache เพื่อเพิ่มประสิทธิภาพ
    const cacheKey = `doc_number_${type}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      return cached;
    }

    const documents = this.getAll();
    const existingNumbers = documents.map((doc) => doc.documentNumber);
    const newNumber = generateDocumentNumber(type, existingNumbers);

    // cache ไว้ 5 นาที
    sessionStorage.setItem(cacheKey, newNumber);
    setTimeout(() => sessionStorage.removeItem(cacheKey), 5 * 60 * 1000);

    return newNumber;
  },

  // Delete a document by ID
  deleteById: (id: string): void => {
    const documents = getDocuments();
    const updatedDocuments = documents.filter((doc) => doc.id !== id);
    saveDocuments(updatedDocuments);
  },
};
