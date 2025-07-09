import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentForm } from "../create/DocumentForm";
import { DocumentData, DocumentType } from "@/types/document";
import { documentService } from "../../services/documentService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiService } from "@/pages/services/apiService";

// Helper type to ensure document has the correct type
type EnsureDocumentType<T> = Omit<T, "documentType"> & {
  documentType: DocumentType;
  status: string;
  priceType: "inclusive" | "exclusive" | "none";
};

interface ReceiptFormProps {
  onSave?: (data: DocumentData) => Promise<void>;
  onCancel?: () => void;
  initialData?: DocumentData;
  isLoading?: boolean;
  editMode?: boolean;
}

const ReceiptForm = ({
  onSave: externalOnSave,
  onCancel: externalOnCancel,
  initialData: externalInitialData,
  isLoading: externalIsLoading = false,
  editMode = false,
}: ReceiptFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [initialData, setInitialData] = useState<
    EnsureDocumentType<DocumentData>
  >({
    id: `rc_${Date.now()}`,
    documentNumber: "",
    documentType: "receipt",
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
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reference: "",
    status: "ชำระแล้ว",
    priceType: "exclusive",
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load document data if editing
  useEffect(() => {
    setIsLoading(true);
    if (externalInitialData) {
      setInitialData({
        ...externalInitialData,
        documentType: "receipt",
        status: externalInitialData.status || "ชำระแล้ว",
        priceType: externalInitialData.priceType || "exclusive",
      });
      setIsEditing(true);
      setIsLoading(false);
      setIsClient(true);
      return;
    }
    // For new document, generate a document number
    const newNumber = documentService.generateNewDocumentNumber("receipt");
    setInitialData((prev) => ({
      ...prev,
      documentNumber: newNumber,
      documentType: "receipt",
      status: "ชำระแล้ว",
      priceType: "exclusive",
    }));
    setIsLoading(false);
    setIsClient(true);
  }, [externalInitialData]);

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
      // Ensure document type is set correctly
      const documentToSave: EnsureDocumentType<DocumentData> = {
        ...data,
        documentType: "receipt",
        updatedAt: new Date().toISOString(),
        status: data.status || "ชำระแล้ว",
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
        dueDate:
          data.dueDate ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
      };
      // Save to backend first
      const savedDocumentFromApi =
        await apiService.createDocument(documentToSave);
      // Save to localStorage for sync
      const savedDocument = documentService.save(savedDocumentFromApi);
      toast.success(
        isEditing
          ? "อัพเดทใบเสร็จเรียบร้อยแล้ว"
          : "สร้างใบเสร็จใหม่เรียบร้อยแล้ว",
        {
          description: `ใบเสร็จเลขที่ ${savedDocument.documentNumber} ถูกบันทึกเรียบร้อยแล้ว`,
        }
      );
      navigate("/documents/receipt");
      if (externalOnSave) {
        await externalOnSave(savedDocument);
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกใบเสร็จ", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
      throw error;
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

  const pageTitle = editMode ? "แก้ไขใบเสร็จ" : "สร้างใบเสร็จ";
  const pageSubtitle = editMode
    ? "แก้ไขข้อมูลใบเสร็จ"
    : "กรอกข้อมูลเพื่อสร้างใบเสร็จใหม่";

  return (
    <div className="container mx-auto py-6">
      <DocumentForm
        documentType="receipt"
        onCancel={handleCancel}
        onSave={async (payload) => {
          await handleSave(payload as unknown as DocumentData);
        }}
        initialData={initialData}
        isLoading={isLoading}
        editMode={editMode}
        pageTitle={pageTitle}
        pageSubtitle={pageSubtitle}
      />
    </div>
  );
};

export default ReceiptForm;
