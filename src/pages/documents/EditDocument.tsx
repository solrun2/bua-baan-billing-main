import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { UnifiedDocumentForm } from "@/components/UnifiedDocumentForm";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { DocumentData, DocumentPayload } from "@/types/document";

const EditDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  console.log("[DEBUG] EditDocument - URL params:", { id });
  console.log("[DEBUG] EditDocument - location:", {
    pathname: location.pathname,
    search: location.search,
  });
  const [initialData, setInitialData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRelated, setHasRelated] = useState(false);

  useEffect(() => {
    console.log("[DEBUG] EditDocument useEffect - id from params:", id);
    if (!id) {
      toast.error("ไม่พบ ID ของเอกสาร");
      setLoading(false);
      navigate(-1);
      return;
    }

    const fetchDocument = async () => {
      console.log("[DEBUG] EditDocument - fetching document with ID:", id);
      try {
        const data = await apiService.getDocumentById(id);
        if (!data) {
          toast.error("ไม่พบเอกสารที่ต้องการแก้ไข");
          navigate(-1);
          return;
        }

        const getLocalDate = (dateString: string | undefined): string => {
          if (!dateString) return "";

          const date = new Date(dateString);

          const year = date.getFullYear();
          const month = date.getMonth() + 1; // getMonth() เริ่มจาก 0
          const day = date.getDate();
          return `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
        };

        const adjustedData = {
          ...data,
          documentDate: getLocalDate(data.documentDate),
          dueDate: getLocalDate(data.dueDate),
          validUntil: getLocalDate(data.validUntil),
        };

        console.log("🔍 [EditDocument] raw data from API:", data);
        console.log("🔍 [EditDocument] adjusted data:", adjustedData);
        console.log("🔍 [EditDocument] receipt_details:", data.receipt_details);
        console.log(
          "🔍 [EditDocument] receipt_details.payment_channels:",
          data.receipt_details?.payment_channels
        );

        setInitialData(adjustedData);
      } catch (err) {
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const checkRelated = async () => {
      const data = await apiService.getDocuments();
      const relatedDocs = data.documents.filter(
        (doc: any) => String(doc.related_document_id) === String(id)
      );
      if (relatedDocs.length > 0) {
        const docList = relatedDocs
          .map(
            (doc: any) =>
              `${doc.document_type || ""} เลขที่: ${doc.document_number || doc.id}`
          )
          .join(", ");
        toast.error(
          `ไม่สามารถแก้ไขเอกสารนี้ได้ เนื่องจากมีเอกสาร ${docList} อ้างอิงอยู่`
        );
        navigate(-1);
      }
      setHasRelated(relatedDocs.length > 0);
    };
    checkRelated();
  }, [id, navigate]);

  const handleSave = async (data: DocumentPayload) => {
    if (!id) return;
    try {
      await apiService.updateDocument(id, data);
      if (!location.state || !location.state.suppressToastSuccess) {
        toast.success("บันทึกเอกสารสำเร็จ");
      }
      navigate(-1);
    } catch (e) {
      toast.error("บันทึกเอกสารไม่สำเร็จ");
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (loading) {
    return <div className="p-4">กำลังโหลดข้อมูลเอกสาร...</div>;
  }

  if (!initialData) {
    return <div className="p-4">ไม่พบข้อมูลเอกสาร</div>;
  }

  return (
    <UnifiedDocumentForm
      initialData={initialData}
      onSave={handleSave}
      onCancel={handleCancel}
      documentType={initialData.documentType!}
      isLoading={loading}
      editMode={true}
      variant="default"
      showActions={true}
      showSummary={true}
    />
  );
};

export default EditDocumentPage;
