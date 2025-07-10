import React from "react";
import DocumentModal from "../DocumentModal";
import { DocumentData } from "@/types/document";

interface InvoiceModalProps {
  open: boolean;
  onClose: () => void;
  invoice: DocumentData;
}

const InvoiceModal: React.FC<InvoiceModalProps> = ({
  open,
  onClose,
  invoice,
}) => {
  console.log("[InvoiceModal] แสดง Modal:", {
    isOpen: open,
    documentNumber: invoice?.documentNumber,
    hasItems: !!invoice?.items?.length,
  });

  return (
    <DocumentModal
      type="invoice"
      document={invoice as any}
      open={open}
      onClose={onClose}
    />
  );
};

export default InvoiceModal;
