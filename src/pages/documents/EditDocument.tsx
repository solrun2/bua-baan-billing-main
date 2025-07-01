import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DocumentForm } from "../sub/create/DocumentForm";
import { apiService } from "../services/apiService";
import { toast } from "sonner";

const EditDocumentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService
      .getDocumentById(id)
      .then(setInitialData)
      .catch(() => toast.error("ไม่พบเอกสาร"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (data: any) => {
    try {
      await apiService.updateDocument(id, data);
      toast.success("บันทึกสำเร็จ");
      navigate(-1); // กลับไปหน้าก่อนหน้า
    } catch (e) {
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!initialData) return <div>ไม่พบเอกสาร</div>;

  return (
    <DocumentForm
      initialData={initialData}
      onSave={handleSave}
      onCancel={() => navigate(-1)}
      documentType={initialData.documentType}
      isLoading={false}
      isEditMode
    />
  );
};

export default EditDocumentPage;
