import { DocumentData } from "@/types/document";

// This is a placeholder service. In a real application, you would
// likely use a library like Axios to make HTTP requests to your backend API.

const createQuotation = async (data: DocumentData): Promise<DocumentData> => {
  console.log("Creating quotation:", data);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Simulate a successful response
  const createdQuotation = { ...data, id: `new-${Date.now()}` }; // Assign a dummy ID
  console.log("Quotation created:", createdQuotation);
  return createdQuotation;
};

const updateQuotation = async (id: string, data: DocumentData): Promise<DocumentData> => {
  console.log(`Updating quotation ${id}:`, data);
  // Simulate API call
  await new Promise(resolve => setTimeout(resolve, 1000));
  // Simulate a successful response
  console.log("Quotation updated:", data);
  return data;
};

export const quotationService = {
  createQuotation,
  updateQuotation,
};
