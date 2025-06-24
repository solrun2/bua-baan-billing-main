import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DocumentForm } from "../create/DocumentForm";
import { DocumentData } from "@/types/document";
import { Loader2 } from "lucide-react";

interface InvoiceFormProps {
  onSave: (data: DocumentData) => Promise<void>;
  initialData: DocumentData;
  isLoading: boolean;
}

const InvoiceForm = ({ onSave, initialData, isLoading }: InvoiceFormProps) => {
  const navigate = useNavigate();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleCancel = () => {
    navigate(-1);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }


  return (
    <div className="container mx-auto py-6">
      <DocumentForm
        documentType="invoice"
        onCancel={handleCancel}
        onSave={onSave}
        initialData={initialData}
        isLoading={isLoading}
      />
    </div>
  );
};

export default InvoiceForm;
