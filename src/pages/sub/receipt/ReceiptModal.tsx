import React from "react";
import DocumentModal from "../DocumentModal";
import { DocumentData } from "@/types/document";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: DocumentData;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  open,
  onClose,
  receipt,
}) => {
  console.log("[ReceiptModal] แสดง Modal:", {
    isOpen: open,
    documentNumber: receipt?.documentNumber,
    hasItems: !!receipt?.items?.length,
  });

  return (
    <DocumentModal
      type="receipt"
      document={receipt as any}
      open={open}
      onClose={onClose}
    />
  );
};

export default ReceiptModal;
