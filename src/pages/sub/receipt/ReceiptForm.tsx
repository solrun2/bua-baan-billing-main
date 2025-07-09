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
  const [initialData, setInitialData] =
    useState<EnsureDocumentType<DocumentData>>();
  const [isEditing, setIsEditing] = useState(false);

  // โหลดข้อมูลใบเสร็จเมื่อ editMode และมี id
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (editMode && id) {
        try {
          const data = await apiService.getDocumentById(id);
          setInitialData({
            ...data,
            documentType: "receipt",
            status: data.status || "ชำระแล้ว",
            priceType: data.priceType || "exclusive",
          });
          setIsEditing(true);
        } catch (err) {
          toast.error("ไม่พบใบเสร็จ");
        } finally {
          setIsLoading(false);
          setIsClient(true);
        }
        return;
      }
      // กรณีสร้างใหม่หรือรับ initialData จาก props
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
      setInitialData({
        id: `rc_${Date.now()}`,
        documentNumber: newNumber,
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
      setIsEditing(false);
      setIsLoading(false);
      setIsClient(true);
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, id, externalInitialData]);

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
      let savedDocumentFromApi;
      if (editMode && id) {
        savedDocumentFromApi = await apiService.updateDocument(
          id,
          documentToSave
        );
        toast.success("อัพเดทใบเสร็จเรียบร้อยแล้ว", {
          description: `ใบเสร็จเลขที่ ${savedDocumentFromApi.documentNumber} ถูกบันทึกเรียบร้อยแล้ว`,
        });
      } else {
        savedDocumentFromApi = await apiService.createDocument(documentToSave);
        toast.success("สร้างใบเสร็จใหม่เรียบร้อยแล้ว", {
          description: `ใบเสร็จเลขที่ ${savedDocumentFromApi.documentNumber} ถูกบันทึกเรียบร้อยแล้ว`,
        });
      }
      documentService.save(savedDocumentFromApi);
      navigate("/documents/receipt");
      if (externalOnSave) {
        await externalOnSave(savedDocumentFromApi);
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

  if (!isClient || isLoading || !initialData) {
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
