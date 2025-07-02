import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentForm } from "../create/DocumentForm";
import { DocumentData, DocumentType } from "@/types/document";
import { invoiceService } from "../../services/invoiceService";
import { documentService } from "../../services/documentService";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// Helper type to ensure document has the correct type
type EnsureDocumentType<T> = Omit<T, "documentType"> & {
  documentType: DocumentType;
  status: string;
  priceType: "inclusive" | "exclusive" | "none";
};

interface InvoiceFormProps {
  onSave?: (data: DocumentData) => Promise<void>;
  onCancel?: () => void;
  initialData?: DocumentData;
  isLoading?: boolean;
}

const InvoiceForm = ({
  onSave: externalOnSave,
  onCancel: externalOnCancel,
  initialData: externalInitialData,
  isLoading: externalIsLoading = false,
}: InvoiceFormProps) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [initialData, setInitialData] = useState<
    EnsureDocumentType<DocumentData>
  >({
    id: `inv_${Date.now()}`,
    documentNumber: "",
    documentType: "invoice",
    customer: { name: "", tax_id: "", phone: "", address: "" },
    items: [],
    summary: {
      subtotal: 0,
      discount: 0,
      tax: 0,
      total: 0,
      withholding_tax_option: "ไม่ระบุ",
    },
    notes: "",
    documentDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reference: "",
    status: "รอชำระ",
    priceType: "exclusive",
  });

  const [isEditing, setIsEditing] = useState(false);

  // Load document data if editing
  useEffect(() => {
    const loadDocument = async () => {
      setIsLoading(true);
      try {
        if (id) {
          setIsEditing(true);
          // Try to load from document service (local storage)
          const doc = documentService.getById(id);

          if (doc) {
            // Ensure all required fields are set
            const documentData: EnsureDocumentType<DocumentData> = {
              ...doc,
              documentType: "invoice",
              status: doc.status || "รอชำระ",
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
                withholding_tax_option: doc.withholding_tax_option || "ไม่ระบุ",
              },
              notes: doc.notes || "",
              documentNumber: doc.documentNumber || "",
              documentDate:
                doc.documentDate || new Date().toISOString().split("T")[0],
              reference: doc.reference || "",
              dueDate:
                doc.dueDate ||
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0],
            };

            setInitialData(documentData);
          } else {
            // If not found in local storage, show error
            toast.error("ไม่พบเอกสารที่ต้องการแก้ไข");
            navigate("/documents/invoice");
          }
        } else if (externalInitialData) {
          // Use provided initial data
          setInitialData({
            ...externalInitialData,
            documentType: "invoice",
            status: externalInitialData.status || "รอชำระ",
            priceType: externalInitialData.priceType || "exclusive",
          });
        } else {
          // For new document, generate a document number
          const newNumber =
            documentService.generateNewDocumentNumber("invoice");
          setInitialData((prev) => ({
            ...prev,
            documentNumber: newNumber,
            documentType: "invoice",
            status: "รอชำระ",
            priceType: "exclusive",
          }));
        }
      } catch (error) {
        console.error("Error loading document:", error);
        toast.error("ไม่สามารถโหลดข้อมูลเอกสารได้");
        navigate("/documents/invoice");
      } finally {
        setIsLoading(false);
        setIsClient(true);
      }
    };

    loadDocument();
  }, [id, externalInitialData, navigate]);

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
        documentType: "invoice",
        updatedAt: new Date().toISOString(),
        // Ensure required fields are set
        status: data.status || "รอชำระ",
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
          withholding_tax_option: data.withholding_tax_option || "ไม่ระบุ",
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

      // Save using the invoice service (which will handle both API and localStorage)
      let savedDocument: DocumentData;

      if (isEditing && id) {
        savedDocument = await invoiceService.updateInvoice(id, documentToSave);
      } else {
        savedDocument = await invoiceService.createInvoice(documentToSave);
      }

      // Show success message
      toast.success(
        isEditing
          ? "อัพเดทเอกสารเรียบร้อยแล้ว"
          : "สร้างเอกสารใหม่เรียบร้อยแล้ว",
        {
          description: `เอกสารเลขที่ ${savedDocument.documentNumber} ถูกบันทึกเรียบร้อยแล้ว`,
        }
      );

      // Navigate back to the invoices list
      navigate("/documents/invoice");

      // Call the onSave callback if provided
      if (externalOnSave) {
        await externalOnSave(savedDocument);
      }
    } catch (error) {
      console.error("Error saving invoice:", error);
      toast.error("เกิดข้อผิดพลาดในการบันทึกเอกสาร", {
        description: "กรุณาลองใหม่อีกครั้ง",
      });
      throw error; // Re-throw to allow the form to handle the error
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
        documentType="invoice"
        onCancel={handleCancel}
        onSave={handleSave}
        initialData={{ ...initialData, status: "รอชำระ" }}
        isLoading={isLoading || externalIsLoading}
      />
    </div>
  );
};

export default InvoiceForm;
