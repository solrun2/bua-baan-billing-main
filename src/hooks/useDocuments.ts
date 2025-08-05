import { useState, useEffect, useMemo } from "react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";

// Interface ที่ตรงกับข้อมูลจาก apiService.getDocuments()
export interface ApiDocument {
  id: number; // ✨ id เป็น number
  document_number: string;
  customer_name: string;
  vendor_name?: string;
  issue_date: string; // 'YYYY-MM-DD'
  due_date?: string;
  valid_until?: string;
  total_amount: number;
  status: string;
  document_type: string;
  summary?: { netTotalAmount?: number };
}

// Interface สำหรับข้อมูลที่ผ่านการประมวลผลแล้ว (จะมี id เป็น string)
export interface ProcessedDocument extends Omit<ApiDocument, "id"> {
  id: string; // ✨ id เป็น string
  displayName: string;
  displayDate: string;
  displayDueDate: string;
  displayValidUntil: string;
  displayTotal: string;
  dateValue: number;
  dueDateValue: number;
  validUntilValue: number;
  totalValue: number;
}

// Interface สำหรับ Filters
interface Filters {
  status?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export const useDocuments = (documentType: string) => {
  const [rawDocuments, setRawDocuments] = useState<ApiDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: "all",
    dateFrom: null,
    dateTo: null,
  });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        const filteredData = data.documents.filter(
          (doc: any) => doc.document_type === documentType
        );
        setRawDocuments(filteredData);
      } catch (err) {
        console.error(`[useDocuments - ${documentType}] Load error:`, err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    loadDocuments();
  }, [documentType]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleCancel = async (id: string) => {
    // id ที่รับเข้ามาเป็น string
    if (
      window.confirm(
        "คุณต้องการยกเลิกเอกสารนี้ใช่หรือไม่?\n\nหมายเหตุ: การยกเลิกเอกสารลูกจะทำให้เอกสารแม่ถูกยกเลิกอัตโนมัติ"
      )
    ) {
      toast.promise(apiService.cancelDocument(id), {
        loading: "กำลังยกเลิก...",
        success: (result) => {
          // อัปเดตสถานะเอกสารใน state
          setRawDocuments((prev) =>
            prev.map((doc) =>
              doc.id.toString() === id ? { ...doc, status: "ยกเลิก" } : doc
            )
          );

          let message = "ยกเลิกเอกสารเรียบร้อยแล้ว";
          if (result.relatedDocumentsCancelled > 0) {
            message += ` (เอกสารที่เกี่ยวข้องถูกยกเลิก ${result.relatedDocumentsCancelled} รายการ)`;
          }
          return message;
        },
        error: "เกิดข้อผิดพลาดในการยกเลิก",
      });
    }
  };

  const processedDocuments = useMemo((): ProcessedDocument[] => {
    const searched = searchData(rawDocuments, searchText, [
      "document_number",
      "customer_name",
      "vendor_name",
    ]);

    const filtered = searched.filter((doc) => {
      const isStatusMatch =
        !filters.status ||
        filters.status === "all" ||
        doc.status === filters.status;
      if (!isStatusMatch) return false;

      const docDate = doc.issue_date;
      const isAfterFrom =
        !filters.dateFrom || !docDate || docDate >= filters.dateFrom;
      const isBeforeTo =
        !filters.dateTo || !docDate || docDate <= filters.dateTo;

      return isAfterFrom && isBeforeTo;
    });

    const mapped = filtered.map((doc): ProcessedDocument => {
      const issueDate = new Date(doc.issue_date);
      return {
        ...doc,
        id: doc.id.toString(), // ✨ แปลง id เป็น string
        displayName: doc.customer_name || doc.vendor_name || "",
        displayDate: format(issueDate, "d MMM yy", { locale: th }),
        displayDueDate: doc.due_date
          ? format(new Date(doc.due_date), "d MMM yy", { locale: th })
          : "-",
        displayValidUntil: doc.valid_until
          ? format(new Date(doc.valid_until), "d MMM yy", { locale: th })
          : "-",
        displayTotal: formatCurrency(
          doc.summary?.netTotalAmount ?? doc.total_amount
        ),
        dateValue: issueDate.getTime(),
        dueDateValue: doc.due_date ? new Date(doc.due_date).getTime() : 0,
        validUntilValue: doc.valid_until
          ? new Date(doc.valid_until).getTime()
          : 0,
        totalValue: doc.summary?.netTotalAmount ?? doc.total_amount,
      };
    });

    return sortData(
      mapped,
      sortColumn as keyof ProcessedDocument,
      sortDirection
    );
  }, [rawDocuments, searchText, filters, sortColumn, sortDirection]);

  return {
    documents: processedDocuments,
    loading,
    error,
    searchText,
    setSearchText,
    filters,
    handleFilterChange,
    handleSort,
    sortColumn,
    sortDirection,
    handleCancel,
  };
};
