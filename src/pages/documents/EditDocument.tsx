import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocumentForm } from "../sub/create/DocumentForm";
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { DocumentData, DocumentPayload } from "@/types/document";

const EditDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      toast.error("ไม่พบ ID ของเอกสาร");
      setLoading(false);
      navigate(-1);
      return;
    }

    const fetchDocument = async () => {
      try {
        const data = await apiService.getDocumentById(id);
        if (!data) {
          toast.error("ไม่พบเอกสารที่ต้องการแก้ไข");
          navigate(-1);
          return;
        }

        // --- จุดที่แก้ไข ---
        // ฟังก์ชันสำหรับปรับวันที่ให้ถูกต้องตามโซนเวลาของผู้ใช้ (ฉบับสมบูรณ์)
        const getLocalDate = (dateString: string | undefined): string => {
          if (!dateString) return "";

          // 1. สร้าง Date object จากข้อมูลที่ได้จาก API
          // (เช่น '2025-07-13T17:00:00.000Z')
          const date = new Date(dateString);

          // 2. ดึงค่า ปี, เดือน, วัน ตามโซนเวลาของเบราว์เซอร์โดยตรง
          //    ซึ่งจะได้วันที่ที่ถูกต้องตามปฏิทินของผู้ใช้
          const year = date.getFullYear();
          const month = date.getMonth() + 1; // getMonth() เริ่มจาก 0
          const day = date.getDate();

          // 3. นำมาประกอบกลับเป็นรูปแบบ 'YYYY-MM-DD' ที่ input ต้องการ
          return `${year}-${String(month).padStart(2, "0")}-${String(
            day
          ).padStart(2, "0")}`;
        };
        // --- จบส่วนที่แก้ไข ---

        const adjustedData = {
          ...data,
          documentDate: getLocalDate(data.documentDate),
          dueDate: getLocalDate(data.dueDate),
          validUntil: getLocalDate(data.validUntil),
        };

        setInitialData(adjustedData);
      } catch (err) {
        console.error("[EditDocument] Error loading document:", err);
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูลเอกสาร");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();
  }, [id, navigate]);

  const handleSave = async (data: DocumentPayload) => {
    if (!id) return;
    try {
      await apiService.updateDocument(id, data);
      toast.success("บันทึกเอกสารสำเร็จ");
      navigate(-1); // กลับไปหน้าก่อนหน้า
    } catch (e) {
      console.error("Failed to save document:", e);
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
    <DocumentForm
      initialData={initialData}
      onSave={handleSave}
      onCancel={handleCancel}
      documentType={initialData.documentType!}
      isLoading={loading}
      editMode={true}
    />
  );
};

export default EditDocumentPage;
