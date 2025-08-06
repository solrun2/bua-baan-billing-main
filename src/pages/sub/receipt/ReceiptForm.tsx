import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { UnifiedDocumentForm } from "@/components/UnifiedDocumentForm";
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
  initialData?: EnsureDocumentType<DocumentData>;
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
  const [isLoading, setIsLoading] = useState(false); // เปลี่ยนจาก true เป็น false
  const [isClient, setIsClient] = useState(false);
  const [initialData, setInitialData] =
    useState<EnsureDocumentType<DocumentData>>();
  const [isEditing, setIsEditing] = useState(false);

  // โหลดข้อมูลใบเสร็จเมื่อ editMode และมี id
  useEffect(() => {
    const fetchData = async () => {
      // กรณีสร้างใหม่หรือรับ initialData จาก props - ไม่ต้องโหลด
      if (externalInitialData) {
        setInitialData({
          ...externalInitialData,
          documentType: "receipt",
          status: externalInitialData.status || "ชำระแล้ว",
          priceType: externalInitialData.priceType || "exclusive",
        });
        setIsEditing(true);
        setIsClient(true);
        return;
      }

      // กรณีแก้ไขและมี id
      if (editMode && id) {
        setIsLoading(true);
        try {
          console.log("Fetching receipt data from API:", id);
          const data = await apiService.getDocumentById(id);
          console.log("API response (ReceiptForm)", data);

          setInitialData({
            ...data,
            documentType: "receipt",
            status: data.status || "ร่าง",
            priceType: data.priceType || "exclusive",
          });
          setIsEditing(true);
        } catch (err) {
          console.error("Error fetching receipt:", err);
          const errorMessage =
            err instanceof Error ? err.message : "ไม่พบใบเสร็จ";
          toast.error(errorMessage);
          navigate("/documents/receipt"); // กลับไปหน้าหลักถ้าไม่พบข้อมูล
        } finally {
          setIsLoading(false);
          setIsClient(true);
        }
      } else {
        // กรณีสร้างใหม่
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
          reference: "",
          status: "ร่าง",
          priceType: "exclusive",
        });
        setIsClient(true);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, id, externalInitialData]);

  const handleSave = async (data: DocumentData) => {
    setIsLoading(true);
    try {
      // Ensure document type is set correctly
      const documentToSave: EnsureDocumentType<DocumentData> = {
        ...data,
        documentType: "receipt",
        updatedAt: new Date().toISOString(),
        // Ensure required fields are set
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
      };

      // Save using the document service
      let savedDocument: DocumentData;

      if (isEditing && id) {
        savedDocument = await apiService.updateDocument(id, documentToSave);
        console.log(
          "[ReceiptForm] อัพเดทเอกสารสำเร็จ:",
          savedDocument.documentNumber
        );
      } else {
        savedDocument = await apiService.createDocument(documentToSave);
        console.log(
          "[ReceiptForm] สร้างเอกสารใหม่สำเร็จ:",
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

      // Navigate back to the receipts list
      navigate("/documents/receipt");

      // Call the onSave callback if provided
      if (externalOnSave) {
        await externalOnSave(savedDocument);
      }
    } catch (error) {
      console.error("Error saving receipt:", error);
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
      navigate(-1);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="container mx-auto py-6">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 w-full bg-gray-200 rounded animate-pulse"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pageTitle = editMode ? "แก้ไขใบเสร็จ" : "สร้างใบเสร็จ";
  const pageSubtitle = editMode
    ? "แก้ไขข้อมูลใบเสร็จ"
    : "กรอกข้อมูลเพื่อสร้างใบเสร็จใหม่";

  return (
    <UnifiedDocumentForm
      documentType="receipt"
      onCancel={handleCancel}
      onSave={async (payload) => {
        await handleSave(payload as unknown as DocumentData);
      }}
      initialData={initialData}
      isLoading={isLoading}
      editMode={editMode || isEditing}
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
      variant="default"
      showActions={true}
      showSummary={true}
    />
  );
};

export default ReceiptForm;
