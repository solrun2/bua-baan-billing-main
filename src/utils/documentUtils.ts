/**
 * Generates a document number based on the document type and current date
 * @param type - Type of the document ('quotation' | 'invoice' | 'receipt' | 'tax_invoice')
 * @param existingNumbers - Optional array of existing document numbers to ensure uniqueness
 * @returns A formatted document number (e.g., 'QT-2024-001')
 */
export const generateDocumentNumber = (
  type: 'quotation' | 'invoice' | 'receipt' | 'tax_invoice',
  existingNumbers: string[] = []
): string => {
  const prefixMap = {
    quotation: 'QT',
    invoice: 'INV',
    receipt: 'RC',
    tax_invoice: 'TAX'
  };

  const prefix = prefixMap[type] || 'DOC';
  const year = new Date().getFullYear();
  
  // Find the highest number for this prefix and year
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxNumber = 0;

  existingNumbers.forEach(num => {
    const match = num.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  // Increment the max number and format with leading zeros
  const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
  
  return `${prefix}-${year}-${nextNumber}`;
};

/**
 * Generates a document number for the client-side when server-side checking isn't needed
 * This is a simpler version that just uses timestamp for uniqueness
 */
export const generateClientDocumentNumber = (
  type: 'quotation' | 'invoice' | 'receipt' | 'tax_invoice'
): string => {
  const prefixMap = {
    quotation: 'QT',
    invoice: 'INV',
    receipt: 'RC',
    tax_invoice: 'TAX'
  };

  const prefix = prefixMap[type] || 'DOC';
  const year = new Date().getFullYear();
  const random = Math.floor(100 + Math.random() * 900); // 3-digit random number
  
  return `${prefix}-${year}-${random}`;
};
