import { DocumentData } from "@/types/document";
import { apiService } from "./apiService";

const createQuotation = async (data: DocumentData): Promise<DocumentData> => {
  const result = await apiService.createDocument({ ...data, documentType: 'quotation' });
  // Sync documents after creating a new one
  await apiService.syncDocumentsToLocalStorage();
  return result;
};

const updateQuotation = async (id: string, data: DocumentData): Promise<DocumentData> => {
  const result = await apiService.updateDocument(id, data);
  // Sync documents after update
  await apiService.syncDocumentsToLocalStorage();
  return result;
};

const deleteQuotation = async (id: string): Promise<void> => {
  await apiService.deleteDocument(id);
  // Sync documents after delete
  await apiService.syncDocumentsToLocalStorage();
};

export const quotationService = {
  createQuotation,
  updateQuotation,
  deleteQuotation,
};
