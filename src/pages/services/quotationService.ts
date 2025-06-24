import { DocumentData } from "@/types/document";
import { apiService } from "./apiService";

const createQuotation = async (data: DocumentData): Promise<DocumentData> => {
  return await apiService.createDocument({ ...data, documentType: 'quotation' });
};

const updateQuotation = async (id: string, data: DocumentData): Promise<DocumentData> => {
  return await apiService.updateDocument(id, data);
};

export const quotationService = {
  createQuotation,
  updateQuotation,
};
