import React from "react";
import DocumentModal from "../DocumentModal";
import { DocumentData } from "@/types/document";

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
  quotation: DocumentData;
}

const QuotationModal: React.FC<QuotationModalProps> = ({
  open,
  onClose,
  quotation,
}) => {
  console.log("[QuotationModal] แสดง Modal:", {
    isOpen: open,
    documentNumber: quotation?.documentNumber,
    hasItems: !!quotation?.items?.length,
  });

    return (
    <DocumentModal 
      type="quotation" 
      document={quotation as any} 
      open={open} 
      onClose={onClose} 
    />
  );
};

export default QuotationModal;
