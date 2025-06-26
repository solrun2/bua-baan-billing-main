import React from "react";
import DocumentModal from "../DocumentModal";

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: any;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({ open, onClose, invoice }) => (
  <DocumentModal type="invoice" document={invoice} open={open} onClose={onClose} />
);

export default InvoiceModal;
