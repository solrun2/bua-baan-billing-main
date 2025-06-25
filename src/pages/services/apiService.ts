import { Customer } from "@/types/customer";
import axios from "axios";
import { Document, DocumentData } from "@/types/document";
import { Product } from "@/types/product";
import { ProductFormData } from "@/pages/sub/create/ProductForm";

const API_BASE_URL = 'http://localhost:3001/api';

const getDocuments = async (): Promise<Document[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/documents`);
    if (!response.ok) {
      throw new Error('Failed to fetch documents');
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      console.error('API response for documents is not an array:', data);
      throw new Error('Received invalid data format for documents.');
    }
    return data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

const prepareDocumentData = (document: DocumentData): any => {
  const baseData = {
    customer_id: document.customer.id,
    document_type: document.documentType.toUpperCase(),
    status: document.status,
    issue_date: document.documentDate,
    notes: document.notes,
    items: document.items,
    summary: document.summary,
  };

  if (document.documentType === 'quotation') {
    return {
      ...baseData,
      valid_until: document.validUntil,
    };
  } else if (document.documentType === 'invoice') {
    return {
      ...baseData,
      due_date: document.dueDate,
    };
  }
  
  return baseData;
};

const createDocument = async (document: DocumentData): Promise<DocumentData> => {
    const backendData = prepareDocumentData(document);

    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendData),
      });
      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create document');
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  };

const getCustomers = async (query: string = ''): Promise<Customer[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers?q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch customers");
    }
    // The backend now returns a flat array, so we consume it directly.
    const customersArray = await response.json();

    // Safety check to ensure we always work with an array.
    if (!Array.isArray(customersArray)) {
      console.error('Expected customer data to be an array but got:', customersArray);
      return [];
    }

    return customersArray;
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

const createCustomer = async (customer: Omit<Customer, 'id'>): Promise<{ customer: Customer, customers: Customer[] }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });

    const customers = await response.json();

    if (!response.ok) {
      throw new Error(customers.error || 'Failed to create customer');
    }

    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error('API did not return the expected customer list.');
    }

    const newCustomer = customers.reduce((latest, current) => 
        (latest.id > current.id) ? latest : current
    );

    return { customer: newCustomer, customers: customers };
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
};

// --- Functions from productService ---

const getProducts = async (query: string = ''): Promise<Product[]> => {
    try {
      const response = await fetch(`${API_BASE_URL}/products?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }
      const productsArray = await response.json();

      if (!Array.isArray(productsArray)) {
        console.error('Expected product data to be an array but got:', productsArray);
        return [];
      }

      return productsArray.map((product: any) => ({
        ...product,
        title: product.name,
        price: product.selling_price, 
      }));
    } catch (error) {
      console.error('Error in getProducts:', error);
      throw error;
    }
};

const createProduct = async (productData: ProductFormData): Promise<{ success: boolean; product?: Product; products?: Product[]; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const products = await response.json();

      if (!response.ok) {
        throw new Error(products.error || 'Failed to create product');
      }

      if (!Array.isArray(products) || products.length === 0) {
        throw new Error('API did not return the expected product list.');
      }

      const newProduct = products.reduce((latest, current) => 
        (latest.id > current.id) ? latest : current
      );

      return { success: true, product: newProduct, products: products };

    } catch (error) {
      console.error('Error creating product:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
};

const updateProduct = async (id: string, productData: ProductFormData): Promise<Product> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update product');
    }

    // The backend returns the updated product object directly
    const updatedProduct = await response.json();
    return updatedProduct;

  } catch (error) {
    console.error(`Error updating product ${id}:`, error);
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

export const apiService = {
  getDocuments,
  createDocument,
  updateDocument,
  getCustomers,
  createCustomer,
  getProducts,
  createProduct,
  updateProduct,
  uploadImage,
};
