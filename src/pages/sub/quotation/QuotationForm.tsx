import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentForm } from "../create/DocumentForm";
import { DocumentData, DocumentType } from "@/types/document";
import { quotationService } from "@/pages/services/quotationService";
import { documentService } from "@/pages/services/documentService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Helper type to ensure document has the correct type
type EnsureDocumentType<T> = Omit<T, "documentType"> & {
  documentType: DocumentType;
  status: string;
  priceType: "inclusive" | "exclusive" | "none";
};

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
    priceType: "exclusive",
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
            priceType: doc.priceType || "exclusive",
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
        } else if (externalInitialData) {
          // Use provided initial data
          setInitialData({
            ...externalInitialData,
            documentType: "quotation",
            status: externalInitialData.status || "รอตอบรับ",
            priceType: externalInitialData.priceType || "exclusive",
          });
          console.log("[QuotationForm] ใช้ข้อมูลเริ่มต้นจาก props");
        } else {
          // For new document, generate a document number
          const newNumber =
            documentService.generateNewDocumentNumber("quotation");
          setInitialData((prev) => ({
            ...prev,
            documentNumber: newNumber,
            documentType: "quotation",
            status: "รอตอบรับ",
            priceType: "exclusive",
          }));
          console.log("[QuotationForm] สร้างเอกสารใหม่:", newNumber);
        }
      } catch (error) {
        console.error("[QuotationForm] Error loading document:", error);
        toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
        navigate("/documents/quotation");
      } finally {
        setIsLoading(false);
        setIsClient(true);
      }
    };

    loadDocument();
  }, [id, externalInitialData, externalIsLoading, navigate]);

  const handleCancel = () => {
    if (externalOnCancel) {
      externalOnCancel();
    } else {
      navigate(-1);
    }
  };

  const handleSave = async (data: DocumentData): Promise<void> => {
    try {
      setIsLoading(true);
      console.log("[QuotationForm] กำลังบันทึกเอกสาร:", data.documentNumber);

      // Ensure document type is set correctly
      const documentToSave: EnsureDocumentType<DocumentData> = {
        ...data,
        documentType: "quotation",
        updatedAt: new Date().toISOString(),
        // Ensure required fields are set
        status: data.status || "รอตอบรับ",
        priceType: data.priceType || "exclusive",
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
      console.error("[QuotationForm] Error saving quotation:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกเอกสาร", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
      throw error; // Re-throw to allow the form to handle the error
    } finally {
      setIsLoading(false);
    }
  };

  // Loading skeleton for better UX
  if (!isClient) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <DocumentForm
        documentType="quotation"
        onCancel={handleCancel}
        onSave={async (payload) => {
          await handleSave(payload as unknown as DocumentData);
        }}
        initialData={initialData}
        isLoading={isLoading || externalIsLoading}
      />
    </div>
  );
};

export default QuotationForm;
