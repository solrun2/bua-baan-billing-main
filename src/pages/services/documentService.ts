import { DocumentData } from "@/types/document";

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
      documentNumber: "INV-2024-001",
      customer: { name: "บริษัท ABC จำกัด", tax_id: "", phone: "", address: "" },
      items: [],
      summary: { subtotal: 50000, discount: 0, tax: 3500, total: 53500, withholdingTax: 0 },
      status: "ส่งแล้ว",
      documentDate: "2024-01-15",
      dueDate: "2024-02-15",
      reference: "",
      notes: "",
      priceType: 'exclusive',
    },
    {
      id: "inv_002",
      documentNumber: "INV-2024-002",
      customer: { name: "บริษัท XYZ จำกัด", tax_id: "", phone: "", address: "" },
      items: [],
      summary: { subtotal: 75000, discount: 0, tax: 5250, total: 80250, withholdingTax: 0 },
      status: "ชำระแล้ว",
      documentDate: "2024-01-14",
      dueDate: "2024-02-14",
      reference: "",
      notes: "",
      priceType: 'exclusive',
    },
  ];
  saveDocuments(mockInvoices);
}

// Public service object
export const documentService = {
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

  generateNewDocumentNumber: (type: 'quotation' | 'invoice' | 'receipt' | 'tax_invoice'): string => {
    const documents = getDocuments();
    const prefixMap = {
        quotation: 'QT',
        invoice: 'IV',
        receipt: 'RE',
        tax_invoice: 'TI',
    };
    const prefix = prefixMap[type];
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');

    const relevantDocs = documents.filter(d => d.documentNumber.startsWith(`${prefix}-${year}`)).length + 1;
    const sequence = String(relevantDocs).padStart(4, '0');

    return `${prefix}-${year}-${sequence}`;
  }
};
