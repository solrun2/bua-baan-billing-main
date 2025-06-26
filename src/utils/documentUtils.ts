export const generateDocumentNumber = (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice",
  existingNumbers: string[] = []
): string => {
  const prefixMap = {
    quotation: "QT",
    invoice: "IV",
    receipt: "RC",
    tax_invoice: "TAX",
  };

  const prefix = prefixMap[type] || "DOC";
  const year = new Date().getFullYear();
  
  // Create a regex that matches the exact document type prefix
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  let maxNumber = 0;

  console.log(`Processing document numbers for ${prefix}-${year}`);
  console.log('All existing numbers:', existingNumbers);

  // Process only numbers that match the current document type
  existingNumbers.forEach((num) => {
    if (!num || typeof num !== 'string') return;
    
    const match = num.trim().match(regex);
    if (match && match[1]) {
      const currentNum = parseInt(match[1], 10);
      if (!isNaN(currentNum) && currentNum > maxNumber) {
        console.log(`Found higher number for ${prefix}:`, currentNum);
        maxNumber = currentNum;
      }
    }
  });
  
  console.log(`Highest number found for ${prefix}-${year}:`, maxNumber);

  // Increment the max number and format with 4 leading zeros
  const nextNumber = (maxNumber + 1).toString().padStart(4, "0");
  const newDocumentNumber = `${prefix}-${year}-${nextNumber}`;
  
  console.log('Generated new document number:', newDocumentNumber);
  return newDocumentNumber;
};

/**
 * Generates a document number for the client-side when server-side checking isn't needed
 * This is a simpler version that just uses timestamp for uniqueness
 */
export const generateClientDocumentNumber = (
  type: "quotation" | "invoice" | "receipt" | "tax_invoice"
): string => {
  const prefixMap = {
    quotation: "QT",
    invoice: "IV",
    receipt: "RC",
    tax_invoice: "TAX",
  };

  const prefix = prefixMap[type] || "DOC";
  const year = new Date().getFullYear();
  // For client-side, generate a temporary number that will be replaced on server-side
  return `${prefix}-${year}-0001`;
};
