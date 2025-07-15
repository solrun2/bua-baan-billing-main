import { DocumentData } from "@/types/document";
import { apiService } from "./apiService";

const createQuotation = async (data: DocumentData): Promise<DocumentData> => {
  const result = await apiService.createDocument({
    ...data,
    documentType: "quotation",
  });
  // ลบการ syncDocumentsToLocalStorage
  return result;
};

const updateQuotation = async (
  id: string,
  data: DocumentData
): Promise<DocumentData> => {
  const result = await apiService.updateDocument(id, data);
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
