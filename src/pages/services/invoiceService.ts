import { DocumentData } from "@/types/document";
import { apiService } from "./apiService";
import { documentService } from "./documentService";

/**
 * Create a new invoice
 * @param data Invoice data
 * @returns Promise with the created invoice
 */
export const createInvoice = async (data: DocumentData): Promise<DocumentData> => {
  try {
    // First save to API
    const invoice = await apiService.createDocument(data);
    
    // Then save to local storage
    documentService.save(invoice);
    
    return invoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    // If API fails, try to save to local storage as fallback
    const localInvoice = documentService.save(data);
    return localInvoice;
  }
};

/**
 * Update an existing invoice
 * @param id Invoice ID
 * @param data Updated invoice data
 * @returns Promise with the updated invoice
 */
export const updateInvoice = async (id: string, data: DocumentData): Promise<DocumentData> => {
  try {
    // First update in API
    const updatedInvoice = await apiService.updateDocument(id, data);
    
    // Then update in local storage
    documentService.save(updatedInvoice);
    
    return updatedInvoice;
  } catch (error) {
    console.error('Error updating invoice:', error);
    // If API fails, try to update in local storage as fallback
    const localInvoice = documentService.save({
      ...data,
      id, // Ensure ID is set
      updatedAt: new Date().toISOString(),
    });
    return localInvoice;
  }
};

/**
 * Get an invoice by ID
 * @param id Invoice ID
 * @returns Promise with the invoice data
 */
export const getInvoice = async (id: string): Promise<DocumentData | null> => {
  try {
    // First try to get from API
    const documents = await apiService.getDocuments();
    const doc = documents.find(d => {
      const documentId = String(d.id);
      return documentId === id && d.document_type === 'INVOICE';
    });
    
    if (doc) {
      // Map the Document to DocumentData
      const invoice: DocumentData = {
        id: String(doc.id),
        documentType: 'invoice',
        documentNumber: doc.document_number,
        documentDate: doc.issue_date,
        dueDate: doc.due_date || '',
        reference: doc.document_number, // Using document number as reference if not available
        priceType: 'inclusive', // Defaulting to inclusive pricing
        customer: {
          id: doc.id, // Note: This might need adjustment based on your data model
          name: doc.customer_name,
          tax_id: '', // These fields might need to be populated from your API
          phone: doc.customer_phone || '',
          address: doc.customer_address || '',
        },
        items: doc.items?.map(item => ({
          ...item,
          id: item.id || Math.random().toString(36).substring(2, 9), // Generate ID if not present
          productId: item.productId || '',
          productTitle: item.productTitle || 'Untitled Item',
          description: item.description || '',
          unit: item.unit || 'ชิ้น',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          priceType: item.priceType || 'inclusive',
          discount: item.discount || 0,
          discountType: item.discountType || 'thb',
          tax: item.tax || 0,
          amountBeforeTax: item.amountBeforeTax || 0,
          withholdingTax: item.withholdingTax || 0,
          amount: item.amount || 0,
          isEditing: false
        })) || [],
        summary: {
          subtotal: doc.total_amount || 0,
          discount: 0, // These might need to be calculated or retrieved from the API
          tax: 0,
          total: doc.total_amount || 0,
          withholdingTax: 0
        },
        notes: '', // Notes not available in the Document type
        status: doc.status || 'ร่าง'
      };
      
      // Save to local storage for offline access
      documentService.save(invoice);
      return invoice;
    }
  } catch (error) {
    console.error('Error fetching invoice from API:', error);
    // Fallback to local storage if API fails
    return documentService.getById(id);
  }
  
  return null;
};

export const getInvoices = async (): Promise<DocumentData[]> => {
  try {
    // First try to get from API
    const documents = await apiService.getDocuments();
    const invoices = documents
      .filter(doc => doc.document_type === 'INVOICE')
      .map(doc => {
        const documentData: DocumentData = {
          id: doc.id?.toString(),
          documentType: doc.document_type.toLowerCase() as 'quotation' | 'invoice' | 'receipt' | 'tax_invoice',
          customer: {
            name: doc.customer_name,
            tax_id: '',
            phone: doc.customer_phone || '',
            address: doc.customer_address || ''
          },
          items: doc.items || [],
          summary: {
            subtotal: doc.total_amount,
            discount: 0,
            tax: 0,
            total: doc.total_amount,
            withholdingTax: 0
          },
          notes: '',
          documentNumber: doc.document_number,
          documentDate: doc.issue_date,
          priceType: 'inclusive',
          reference: '',
          status: doc.status || 'ร่าง',
          validUntil: doc.due_date || ''
        };
        return documentData;
      });
    
    // Save all to local storage for offline access
    if (invoices.length > 0) {
      invoices.forEach(doc => documentService.save(doc));
    }
    
    return invoices;
  } catch (error) {
    console.error('Error fetching invoices from API:', error);
    // Fallback to local storage if API fails
    const allDocuments = documentService.getAll();
    return allDocuments.filter(doc => doc.documentType === 'invoice');
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    // First delete from API
    await apiService.deleteDocument(id);
  } catch (error) {
    console.error('Error deleting invoice from API:', error);
    // Continue to delete from local storage even if API fails
  }
  
  // Always delete from local storage
  documentService.deleteById(id);
};

export const invoiceService = {
  createInvoice,
  updateInvoice,
  getInvoice,
  getInvoices,
  deleteInvoice,
};

export default invoiceService;
