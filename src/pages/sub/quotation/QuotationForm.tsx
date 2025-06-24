import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DocumentData } from "@/types/document";
import { DocumentForm } from "../create/DocumentForm";
import { quotationService } from "@/pages/services/quotationService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface QuotationFormProps {
  onSave?: (data: DocumentData) => Promise<void>;
  onCancel?: () => void;
  initialData?: DocumentData;
  isLoading?: boolean;
}

const QuotationForm = ({
  onSave: externalOnSave,
  onCancel: externalOnCancel,
  initialData: externalInitialData,
  isLoading: externalIsLoading = false,
}: QuotationFormProps) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(externalIsLoading);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [initialData] = useState(() => {
    if (externalInitialData) {
      return externalInitialData;
    }
    const generateQuotationNumber = () =>
      `QT-${new Date().getFullYear()}-${String(
        Math.floor(1000 + Math.random() * 9000)
      )}`;
    return {
      documentNumber: generateQuotationNumber(),
      customer: { name: "", tax_id: "", phone: "", address: "" },
      items: [],
      summary: { subtotal: 0, discount: 0, tax: 0, total: 0, withholdingTax: 0 },
      notes: "",
      documentDate: format(new Date(), "yyyy-MM-dd"),
      validUntil: format(
        new Date(new Date().setDate(new Date().getDate() + 30)),
        "yyyy-MM-dd"
      ),
      reference: "",
      status: "draft",
    };
  });

  const handleCancel = () => {
    if (externalOnCancel) {
      externalOnCancel();
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (data: DocumentData) => {
    setIsLoading(true);
    try {
      if (externalOnSave) {
        await externalOnSave(data);
      } else {
        if (data.id) {
          await quotationService.updateQuotation(data.id, data);
          toast.success("อัปเดตใบเสนอราคาเรียบร้อยแล้ว");
        } else {
          await quotationService.createQuotation(data);
          toast.success("สร้างใบเสนอราคาเรียบร้อยแล้ว");
        }
        navigate("/documents/quotation");
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกใบเสนอราคา");
    } finally {
      setIsLoading(false);
    }
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
        documentType="quotation"
        onCancel={handleCancel}
        onSave={handleSave}
        initialData={initialData}
        isLoading={isLoading}
      />
    </div>
  );
};

export default QuotationForm;
