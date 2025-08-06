import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UnifiedDocumentForm } from "@/components/UnifiedDocumentForm";
import { DocumentData, DocumentType } from "@/types/document";
import { quotationService } from "@/pages/services/quotationService";
import { documentService } from "@/pages/services/documentService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiService } from "@/pages/services/apiService";

// Helper type to ensure document has the correct type
type EnsureDocumentType<T> = Omit<T, "documentType"> & {
  documentType: DocumentType;
  status: string;
  priceType: "EXCLUDE_VAT" | "INCLUDE_VAT" | "NO_VAT";
};

interface QuotationFormProps {
  onSave?: (data: DocumentData) => Promise<void>;
  onCancel?: () => void;
  initialData?: EnsureDocumentType<DocumentData>;
  isLoading?: boolean;
}

const QuotationForm = ({
  onSave: externalOnSave,
  onCancel: externalOnCancel,
  initialData: externalInitialData,
  isLoading: externalIsLoading = false,
}: QuotationFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [initialData, setInitialData] = useState<
    EnsureDocumentType<DocumentData>
  >({
    id: `qt_${Date.now()}`,
    documentNumber: "",
    documentType: "quotation",
    customer: { name: "", tax_id: "", phone: "", address: "" },
    items: [],
    summary: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      withholdingTax: 0,
    },
    notes: "",
    documentDate: new Date().toISOString().split("T")[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reference: "",
    status: "รอตอบรับ",
    priceType: "EXCLUDE_VAT",
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load document data if editing
  useEffect(() => {
    const loadDocument = async () => {
      if (externalIsLoading) return;

      setIsLoading(true);
      try {
        if (id) {
          setIsEditing(true);
          console.log("[QuotationForm] กำลังโหลดเอกสาร ID:", id);

          // Try to load from document service (local storage)
          const doc = documentService.getById(id);

          if (doc == null) {
            console.log("[QuotationForm] ไม่พบเอกสารที่ต้องการแก้ไข", doc);
            toast.error("ไม่พบเอกสารที่ต้องการแก้ไข");
            navigate("/documents/quotation");
            return;
          }

          // Ensure all required fields are set
          const documentData: EnsureDocumentType<DocumentData> = {
            ...doc,
            documentType: "quotation",
            status: doc.status || "รอตอบรับ",
            priceType: doc.priceType || "EXCLUDE_VAT",
            customer: doc.customer || {
              name: "",
              tax_id: "",
              phone: "",
              address: "",
            },
            items: doc.items || [],
            summary: doc.summary || {
              subtotal: 0,
              discount: 0,
              tax: 0,
              total: 0,
              withholdingTax: 0,
            },
            notes: doc.notes || "",
            documentNumber: doc.documentNumber || "",
            documentDate:
              doc.documentDate || new Date().toISOString().split("T")[0],
            reference: doc.reference || "",
          };

          setInitialData(documentData);
          console.log(
            "[QuotationForm] โหลดเอกสารสำเร็จ:",
            documentData.documentNumber
          );
        } else {
          // For new document, generate a document number
          const newNumber = documentService.generateNewDocumentNumber("quotation");
          setInitialData((prev) => ({
            ...prev,
            documentNumber: newNumber,
            documentType: "quotation",
            status: "รอตอบรับ",
            priceType: "EXCLUDE_VAT",
          }));
        }
      } catch (error) {
        console.error("Error loading document:", error);
        toast.error("เกิดข้อผิดพลาดในการโหลดเอกสาร");
      } finally {
        setIsLoading(false);
        setIsClient(true);
      }
    };

    loadDocument();
  }, [id, externalIsLoading, navigate]);

  const handleSave = async (data: DocumentData) => {
    setIsLoading(true);
    try {
      // Ensure document type is set correctly
      const documentToSave: EnsureDocumentType<DocumentData> = {
        ...data,
        documentType: "quotation",
        updatedAt: new Date().toISOString(),
        // Ensure required fields are set
        status: data.status || "รอตอบรับ",
        priceType: data.priceType || "EXCLUDE_VAT",
        customer: data.customer || {
          name: "",
          tax_id: "",
          phone: "",
          address: "",
        },
        items: data.items || [],
        summary: data.summary || {
          subtotal: 0,
          discount: 0,
          tax: 0,
          total: 0,
          withholdingTax: 0,
        },
        notes: data.notes || "",
        documentNumber: data.documentNumber || "",
        documentDate:
          data.documentDate || new Date().toISOString().split("T")[0],
        reference: data.reference || "",
      };

      // Save using the quotation service (which will handle both API and localStorage)
      let savedDocument: DocumentData;

      if (isEditing && id) {
        savedDocument = await quotationService.updateQuotation(
          id,
          documentToSave
        );
        console.log(
          "[QuotationForm] อัพเดทเอกสารสำเร็จ:",
          savedDocument.documentNumber
        );
      } else {
        savedDocument = await quotationService.createQuotation(documentToSave);
        console.log(
          "[QuotationForm] สร้างเอกสารใหม่สำเร็จ:",
          savedDocument.documentNumber
        );
      }

      // Also save to document service for local storage
      documentService.save(savedDocument);

      // Show success message
      toast.success(
        isEditing
          ? "อัพเดทเอกสารเรียบร้อยแล้ว"
          : "สร้างเอกสารใหม่เรียบร้อยแล้ว",
        {
          description: `เอกสารเลขที่ ${savedDocument.documentNumber} ถูกบันทึกเรียบร้อยแล้ว`,
        }
      );

      // Navigate back to the quotations list
      navigate("/documents/quotation");

      // Call the onSave callback if provided
      if (externalOnSave) {
        await externalOnSave(savedDocument);
      }
    } catch (error) {
      console.error("Error saving quotation:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกเอกสาร", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
      throw error; // Re-throw to allow the form to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (externalOnCancel) {
      externalOnCancel();
    } else {
      navigate("/documents/quotation");
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
    <UnifiedDocumentForm
      documentType="quotation"
      onCancel={handleCancel}
      onSave={async (payload) => {
        await handleSave(payload as unknown as DocumentData);
      }}
      initialData={initialData}
      isLoading={isLoading || externalIsLoading}
      editMode={isEditing}
      variant="default"
      showActions={true}
      showSummary={true}
    />
  );
};

export default QuotationForm;
