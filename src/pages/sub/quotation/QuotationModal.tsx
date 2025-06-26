import React from "react";
import DocumentModal from "../DocumentModal";

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
  quotation: any; 
}

const QuotationModal: React.FC<QuotationModalProps> = ({ open, onClose, quotation }) => (
  <DocumentModal type="quotation" document={quotation} open={open} onClose={onClose} />
);

export default QuotationModal;
