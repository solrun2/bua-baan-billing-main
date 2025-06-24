import DocumentForm from "../create/DocumentForm";
import { DocumentData } from "@/types/document";

interface InvoiceFormProps {
  onSave: (data: DocumentData) => Promise<void>;
  initialData: DocumentData;
  isLoading: boolean;
}

const InvoiceForm = ({ onSave, initialData, isLoading }: InvoiceFormProps) => {
  return <DocumentForm 
    documentType="invoice" 
    onCancel={() => window.history.back()}
    onSave={onSave}
    initialData={initialData}
    isLoading={isLoading}
  />;
};

export default InvoiceForm;
