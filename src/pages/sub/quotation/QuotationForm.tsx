import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DocumentData } from "@/types/document";
import DocumentForm from "../create/DocumentForm";
import { quotationService } from "@/pages/services/quotationService";
import { toast } from "sonner";

interface QuotationFormProps {
  onCancel: () => void;
  initialQuotation?: DocumentData; // Optional for editing
}

const QuotationForm = ({ onCancel, initialQuotation }: QuotationFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const generateQuotationNumber = () =>
    `QT-${new Date().getFullYear()}-${String(
      Math.floor(1000 + Math.random() * 9000)
    )}`;

  const defaultInitialData: DocumentData = {
    documentNumber: generateQuotationNumber(),
    customer: { name: "", taxId: "", phone: "", address: "" },
    items: [],
    summary: { subtotal: 0, discount: 0, tax: 0, total: 0 },
    notes: "",
    documentDate: format(new Date(), "yyyy-MM-dd"),
    validUntil: format(
      new Date(new Date().setDate(new Date().getDate() + 30)),
      "yyyy-MM-dd"
    ),
    reference: "",
    status: "draft",
  };

  const [initialData] = useState<DocumentData>(
    initialQuotation || defaultInitialData
  );

  const handleSave = async (data: DocumentData) => {
    setIsLoading(true);
    try {
      if (data.id) {
        // Update existing quotation
        await quotationService.updateQuotation(data.id, data);
        toast.success("อัปเดตใบเสนอราคาเรียบร้อยแล้ว");
      } else {
        // Create new quotation
        await quotationService.createQuotation(data);
        toast.success("สร้างใบเสนอราคาเรียบร้อยแล้ว");
      }
      navigate("/quotations"); // Navigate to the list page after saving
    } catch (error) {
      console.error("Failed to save quotation:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกใบเสนอราคา");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DocumentForm
      onCancel={onCancel}
      onSave={handleSave}
      initialData={initialData}
      documentType="quotation"
      isLoading={isLoading}
    />
  );
};

export default QuotationForm;
