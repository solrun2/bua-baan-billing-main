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

// Initialize with some mock data if storage is empty
if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
  const mockInvoices: DocumentData[] = [
    {
      id: "inv_001",
      documentNumber: "QT-2025-0001",
      documentType: "quotation",
      customer: { name: "บริษัท ABC จำกัด", tax_id: "", phone: "", address: "" },
      items: [],
      summary: { subtotal: 50000, discount: 0, tax: 3500, total: 53500, withholdingTax: 0 },
      status: "รอตอบรับ",
      documentDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: "",
      notes: "",
      priceType: 'exclusive',
    },
    {
      id: "inv_002",
      documentNumber: "INV-2025-0002",
      documentType: "invoice",
      customer: { name: "บริษัท XYZ จำกัด", tax_id: "", phone: "", address: "" },
      items: [],
      summary: { subtotal: 75000, discount: 0, tax: 5250, total: 80250, withholdingTax: 0 },
      status: "ชำระแล้ว",
      documentDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      reference: "",
      notes: "",
      priceType: 'exclusive',
    },
  ];
  saveDocuments(mockInvoices);
}

// Public service object
export const documentService = {
  clearAll: () => {
    localStorage.removeItem('documents');
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
  generateNewDocumentNumber(type: 'quotation' | 'invoice' | 'receipt' | 'tax_invoice'): string {
    const documents = this.getAll();
    const existingNumbers = documents.map(doc => doc.documentNumber);
    return generateDocumentNumber(type, existingNumbers);
  },

  // Delete a document by ID
  deleteById: (id: string): void => {
    const documents = getDocuments();
    const updatedDocuments = documents.filter(doc => doc.id !== id);
    saveDocuments(updatedDocuments);
  }
};
