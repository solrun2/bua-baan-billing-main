import React from "react";
import DocumentModal from "../DocumentModal";

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: any;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  open,
  onClose,
  receipt,
}) => (
  <DocumentModal
    type="receipt"
    document={receipt}
    open={open}
    onClose={onClose}
  />
);

export default ReceiptModal;
