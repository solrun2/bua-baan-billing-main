import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom"; // Import Link
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import QuotationModal from "@/pages/sub/quotation/QuotationModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/pagination";

interface QuotationItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  dateValue: number;
  validUntil: string;
  validUntilValue: number;
  netTotal: number;
  status: string;
  documentDate: string; // 'YYYY-MM-DD' string
}

const Quotation = () => {
  const navigate = useNavigate();
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  }>({ status: "all", dateFrom: null, dateTo: null });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // ใช้ usePagination hook สำหรับ server-side pagination
  const {
    data: quotations,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    setPage,
    refresh,
  } = usePagination<any>("QUOTATION", filters, searchText);

  // แปลงข้อมูล quotations เป็น QuotationItem format
  const quotationItems = useMemo(() => {
    return quotations.map((doc: any): QuotationItem => {
      const issueDate = new Date(doc.issue_date);
      const validUntilDate = doc.valid_until ? new Date(doc.valid_until) : null;
      const netTotal =
        doc.summary && typeof doc.summary.netTotalAmount === "number"
          ? doc.summary.netTotalAmount
          : (doc.total_amount ?? 0);
      return {
        id: doc.id,
        number: doc.document_number,
        customer: doc.customer_name,
        date: format(issueDate, "d MMM yy", { locale: th }),
        dateValue: issueDate.getTime(),
        validUntil: validUntilDate
          ? format(validUntilDate, "d MMM yy", { locale: th })
          : "-",
        validUntilValue: validUntilDate?.getTime() || 0,
        netTotal,
        status: doc.status,
        documentDate: format(issueDate, "yyyy-MM-dd"),
      };
    });
  }, [quotations]);

  // Sort the quotation items
  const sortedQuotationItems = useMemo(() => {
    return sortData(
      quotationItems,
      sortColumn as keyof QuotationItem,
      sortDirection
    );
  }, [quotationItems, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column)
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  const handleFilterChange = (newFilters: any) => setFilters(newFilters);
  const handleEditClick = (id: string) =>
    navigate(`/documents/quotation/edit/${id}`);

  const handleCancelClick = async (id: string) => {
    if (
      window.confirm(
        "คุณต้องการยกเลิกใบเสนอราคานี้ใช่หรือไม่?\n\nหมายเหตุ: การยกเลิกเอกสารลูกจะทำให้เอกสารแม่ถูกยกเลิกอัตโนมัติ"
      )
    ) {
      toast.promise(apiService.cancelDocument(id), {
        loading: "กำลังยกเลิก...",
        success: (result) => {
          refresh(); // Refresh data after deletion
          let message = "ยกเลิกใบเสนอราคาเรียบร้อยแล้ว";
          if (result.relatedDocumentsCancelled > 0) {
            message += ` (เอกสารที่เกี่ยวข้องถูกยกเลิก ${result.relatedDocumentsCancelled} รายการ)`;
          }
          return message;
        },
        error: "เกิดข้อผิดพลาดในการยกเลิก",
      });
    }
  };

  const handleViewClick = useCallback(async (quotation: QuotationItem) => {
    try {
      const fullDoc = await apiService.getDocumentById(quotation.id);
      if (fullDoc) {
        setSelectedQuotation(fullDoc);
        setIsModalOpen(true);
      } else {
        toast.error("ไม่พบข้อมูลเอกสาร");
      }
    } catch (e) {
      toast.error("ไม่สามารถดูรายละเอียดได้");
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "รอตอบรับ":
        return "bg-yellow-100 text-yellow-700";
      case "ตอบรับแล้ว":
        return "bg-green-100 text-green-700";
      case "พ้นกำหนด":
        return "bg-red-100 text-yellow-700";
      case "ยกเลิก":
        return "bg-gray-100 text-red-700";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

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
        <Link to="/documents/quotation/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            สร้างใบเสนอราคาใหม่
          </Button>
        </Link>
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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
        <DocumentFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
          statusOptions={[
            { value: "all", label: "สถานะทั้งหมด" },
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
          <div className="flex items-center justify-between w-full">
            <CardTitle>รายการใบเสนอราคา</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filters.status !== "all" ||
              filters.dateFrom ||
              filters.dateTo ||
              searchText
                ? `พบ ${sortedQuotationItems.length} ฉบับ จากทั้งหมด ${totalCount} ฉบับ`
                : `${totalCount} ฉบับ`}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาด: {error}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { key: "number", label: "เลขที่" },
                      { key: "customer", label: "ลูกค้า" },
                      { key: "dateValue", label: "วันที่" },
                      { key: "validUntilValue", label: "วันหมดอายุ" },
                      { key: "netTotal", label: "จำนวนเงิน" },
                      { key: "status", label: "สถานะ" },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="text-left py-3 px-4 font-medium text-muted-foreground cursor-pointer select-none"
                        onClick={() => handleSort(key)}
                      >
                        {label}{" "}
                        {sortColumn === key &&
                          (sortDirection === "asc" ? "▲" : "▼")}
                      </th>
                    ))}
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground no-print">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedQuotationItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          ยังไม่มีใบเสนอราคา
                        </h3>
                        <p>เริ่มต้นสร้างใบเสนอราคาใหม่ได้เลย</p>
                      </td>
                    </tr>
                  ) : (
                    sortedQuotationItems.map((q) => (
                      <tr
                        key={q.id}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {q.number}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {q.customer}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {q.date}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {q.validUntil}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {/* ยอดสุทธิหลังหัก ณ ที่จ่าย */}
                          {formatCurrency(Number(q.netTotal))}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(q.status)}`}
                          >
                            {q.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 no-print">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewClick(q)}
                            >
                              ดู
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                              onClick={() => handleEditClick(q.id)}
                            >
                              แก้ไข
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleCancelClick(q.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {isModalOpen && selectedQuotation && (
        <QuotationModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          quotation={selectedQuotation}
        />
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        className="mt-4"
      />
    </div>
  );
};

export default Quotation;
