import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import QuotationModal from "@/pages/sub/quotation/QuotationModal";
import { calculateDocumentSummary } from "@/calculate/documentCalculations";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";

const Quotation = () => {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    navigate("/documents/quotation/new");
  };

  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }>({});

  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDocuments();
        const quotationsData = data
          .filter((doc) => doc.document_type === "QUOTATION")
          .map((doc: any) => {
            // ใช้ยอดสุทธิหลังหัก ณ ที่จ่าย ถ้ามี
            const netTotal =
              doc.summary?.netTotalAmount ?? Number(doc.total_amount ?? 0);
            return {
              id: doc.id,
              number: doc.document_number,
              customer: doc.customer_name,
              date: new Date(doc.issue_date).toLocaleDateString("th-TH"),
              validUntil: doc.valid_until
                ? new Date(doc.valid_until).toLocaleDateString("th-TH")
                : "-",
              netTotal: netTotal,
              status: doc.status,
              documentDate: doc.issue_date, // เพิ่มฟิลด์สำหรับการกรอง
            };
          });
        setQuotations(quotationsData);
        // log all documentDate
        console.log(
          "ALL DOCS",
          quotationsData.map((i) => i.documentDate)
        );
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadQuotations();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "รอตอบรับ":
        return "bg-gray-100 text-gray-700";
      case "ตอบรับแล้ว":
        return "bg-green-100 text-green-700";
      case "พ้นกำหนด":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const handleViewClick = useCallback(async (quotation: any) => {
    try {
      const allDocs = await apiService.getDocuments();
      const fullDoc = allDocs.find((doc: any) => doc.id === quotation.id);
      setSelectedQuotation(fullDoc);
      setIsModalOpen(true);
    } catch (err) {
      setSelectedQuotation(null);
      setIsModalOpen(false);
    }
  }, []);

  const handleEditClick = (id: any) => {
    navigate(`/documents/quotation/edit/${id}`);
  };

  const handleDeleteClick = async (id: any) => {
    if (window.confirm("Are you sure you want to delete this quotation?")) {
      try {
        await apiService.deleteDocument(id.toString());
        setQuotations((prevQuotations) =>
          prevQuotations.filter((q) => q.id !== id)
        );
        toast.success("ลบใบเสนอราคาเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Failed to delete quotation:", error);
        toast.error("เกิดข้อผิดพลาดในการลบใบเสนอราคา");
        setError((error as Error).message);
      }
    }
  };

  // Helper เปรียบเทียบวันที่แบบไม่สนใจเวลา (ปลอดภัยกับ invalid date)
  const toDateOnly = (d: string | Date | undefined) => {
    if (!d) return "";
    let dateObj = typeof d === "string" ? new Date(d) : d;
    if (
      typeof d === "string" &&
      d.length === 10 &&
      d.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      const [y, m, day] = d.split("-");
      dateObj = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day)));
    }
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().slice(0, 10);
  };

  // Helper แปลงวันที่ พ.ศ. (dd/mm/yyyy) เป็น ค.ศ. (yyyy-mm-dd)
  const toAD = (dateStr: string | undefined) => {
    if (!dateStr) return "";
    const parts = dateStr.split("/");
    if (parts.length !== 3) return dateStr;
    let [d, m, y] = parts;
    let year = parseInt(y, 10);
    if (year > 2400) year -= 543;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  };

  // Helper แปลง yyyy-MM-dd หรือ yyyy-MM-ddTHH:mm:ss.sssZ string เป็น Date แบบ local (robust)
  function parseLocalDate(str: string): Date | null {
    if (!str) return null;
    // ตัดเวลาออกถ้ามี
    const datePart = str.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    // สร้างวันที่แบบ UTC เพื่อหลีกเลี่ยงปัญหา timezone
    const date = new Date(Date.UTC(y, m - 1, d));
    return isNaN(date.getTime()) ? null : date;
  }

  const filteredQuotations = quotations.filter((q) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      q.status !== filters.status
    ) {
      return false;
    }
    // กรองวันที่สร้าง (>= dateFrom)
    if (filters.dateFrom) {
      // สร้าง filterDate แบบ UTC เพื่อหลีกเลี่ยงปัญหา timezone
      const filterDate = new Date(
        Date.UTC(
          filters.dateFrom.getFullYear(),
          filters.dateFrom.getMonth(),
          filters.dateFrom.getDate()
        )
      );
      const docDate = parseLocalDate(q.documentDate);
      // debug log
      console.log(
        "docDate",
        q.documentDate,
        typeof q.documentDate,
        "parsed",
        docDate,
        "filterDate",
        filterDate,
        "filterDate ISO",
        filterDate.toISOString(),
        typeof filterDate
      );
      if (!docDate) {
        console.log("SKIP: docDate invalid", q.documentDate);
        return false;
      }
      // เปรียบเทียบวันที่แบบ string เพื่อความแม่นยำ
      const docDateStr = docDate.toISOString().split("T")[0];
      const filterDateStr = filterDate.toISOString().split("T")[0];
      console.log("Comparing dates:", docDateStr, ">=", filterDateStr);
      if (docDateStr < filterDateStr) {
        console.log("SKIP: docDate", docDateStr, "< filterDate", filterDateStr);
        return false;
      }
    }
    // กรองวันที่กำหนด (<= dateTo)
    if (filters.dateTo && q.validUntil) {
      const filterDateTo = new Date(
        Date.UTC(
          filters.dateTo.getFullYear(),
          filters.dateTo.getMonth(),
          filters.dateTo.getDate()
        )
      );
      const docDate = parseLocalDate(q.validUntil);
      if (!docDate) {
        return false;
      }
      const docDateStr = docDate.toISOString().split("T")[0];
      const filterDateToStr = filterDateTo.toISOString().split("T")[0];
      console.log("Comparing end dates:", docDateStr, "<=", filterDateToStr);
      if (docDateStr > filterDateToStr) {
        console.log(
          "SKIP: docDate",
          docDateStr,
          "> filterDateTo",
          filterDateToStr
        );
        return false;
      }
    }
    return true;
  });

  // หลัง filter
  console.log("FILTER", filters.dateFrom, typeof filters.dateFrom);
  console.log("AFTER FILTER", filteredQuotations.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบเสนอราคา</h1>
            <p className="text-gray-400">จัดการใบเสนอราคาทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2" onClick={handleCreateNew}>
          <Plus className="w-4 h-4" />
          สร้างใบเสนอราคาใหม่
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบเสนอราคา..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <DocumentFilter
          onFilterChange={setFilters}
          initialFilters={filters}
          statusOptions={[
            { value: "all", label: "ทั้งหมด" },
            { value: "รอตอบรับ", label: "รอตอบรับ" },
            { value: "ตอบรับแล้ว", label: "ตอบรับแล้ว" },
            { value: "พ้นกำหนด", label: "พ้นกำหนด" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      {/* Content */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบเสนอราคา</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาด: {error}</p>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ยังไม่มีใบเสนอราคา</h3>
              <p>เริ่มต้นสร้างใบเสนอราคาใหม่ได้เลย</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      เลขที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ลูกค้า
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      วันที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ยืนราคาถึงวันที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      จำนวนเงิน
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      สถานะ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredQuotations.map((quotation) => (
                    <tr
                      key={quotation.id}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {quotation.number}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {quotation.customer}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {quotation.documentDate
                          ? new Date(
                              toAD(quotation.documentDate)
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {quotation.validUntil
                          ? new Date(
                              toAD(quotation.validUntil)
                            ).toLocaleDateString("en-GB")
                          : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span>{formatCurrency(quotation.netTotal)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quotation.status)}`}
                        >
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClick(quotation)}
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(quotation.id)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(quotation.id)}
                          >
                            ลบ
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <QuotationModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            quotation={selectedQuotation}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Quotation;
