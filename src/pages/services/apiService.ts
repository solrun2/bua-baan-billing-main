import { Customer } from "@/types/customer";
import { Document, DocumentData } from "@/types/document";

const API_BASE_URL = 'http://localhost:3001/api';

const getDocuments = async (): Promise<Document[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

const createDocument = async (document: DocumentData): Promise<DocumentData> => {
    const backendData = {
      customer_id: document.customer.id,
      document_type: (document as any).documentType,
      status: document.status,
      issue_date: document.documentDate,
      due_date: document.validUntil,
      notes: document.notes,
      items: document.items,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to create document');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

const getCustomers = async (): Promise<Customer[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers");
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

const updateDocument = async (id: string, document: DocumentData): Promise<DocumentData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update document');
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

const createCustomer = async (customer: Omit<Customer, 'id'>): Promise<Customer> => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create customer');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  getCustomers,
  createCustomer,
};
