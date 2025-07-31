import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HeartHandshake as ReceiptIcon,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import ReceiptModal from "@/pages/sub/receipt/ReceiptModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format, subDays } from "date-fns";
import { th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_PAGE_SIZE } from "@/constants/documentPageSize";

interface ReceiptItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  dateValue: number;
  netTotal: number;
  status: string;
  documentDate: string;
}

const Receipt = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  }>({ status: "all", dateFrom: null, dateTo: null });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // 1. useMemo ก่อน
  const filteredAndSortedReceipts = useMemo(() => {
    let result = searchData(receipts, searchText, ["number", "customer"]);
    result = result.filter((item) => {
      const isStatusMatch =
        !filters.status ||
        filters.status === "all" ||
        item.status === filters.status;
      if (!isStatusMatch) return false;
      const docDate = item.documentDate;
      let adjustedDateFrom = filters.dateFrom;
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        const prevDay = subDays(fromDate, 1);
        adjustedDateFrom = format(prevDay, "yyyy-MM-dd");
      }
      const isAfterFrom =
        !adjustedDateFrom || !docDate || docDate > adjustedDateFrom;
      const isBeforeTo =
        !filters.dateTo || !docDate || docDate <= filters.dateTo;
      return isAfterFrom && isBeforeTo;
    });
    return sortData(result, sortColumn as keyof ReceiptItem, sortDirection);
  }, [receipts, searchText, filters, sortColumn, sortDirection]);

  // 2. pagination
  const [page, setPage] = useState(1);
  const pageSize = DOCUMENT_PAGE_SIZE;
  const totalPages = Math.ceil(filteredAndSortedReceipts.length / pageSize);
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedReceipts.slice(start, start + pageSize);
  }, [filteredAndSortedReceipts, page]);

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        console.log(
          "[DEBUG] loadReceipts - all documents:",
          data.map((doc) => ({
            id: doc.id,
            document_number: doc.document_number,
            document_type: doc.document_type,
          }))
        );

        const receiptsData = data
          .filter((doc) => doc.document_type === "RECEIPT")
          .map((doc: any): ReceiptItem => {
            const issueDate = new Date(doc.issue_date);
            // คำนวณยอดสุทธิหลังหัก ณ ที่จ่าย
            const netTotal =
              doc.summary && typeof doc.summary.total === "number"
                ? doc.summary.total - (doc.summary.withholdingTax ?? 0)
                : (doc.total_amount ?? 0);
            return {
              id: doc.id,
              number: doc.document_number,
              customer: doc.customer_name,
              date: format(issueDate, "d MMM yy", { locale: th }),
              dateValue: issueDate.getTime(),
              netTotal,
              status: doc.status,
              documentDate: format(issueDate, "yyyy-MM-dd"),
            };
          });
        setReceipts(receiptsData);
      } catch (err) {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    loadReceipts();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column)
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };
  const handleFilterChange = (newFilters: any) => setFilters(newFilters);
  const handleEditClick = (id: string) => {
    console.log(
      "[DEBUG] handleEditClick - navigating to edit receipt with ID:",
      id
    );
    navigate(`/documents/receipt/edit/${id}`);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("คุณต้องการลบใบเสร็จรับเงินนี้ใช่หรือไม่?")) {
      toast.promise(apiService.deleteDocument(id), {
        loading: "กำลังลบ...",
        success: () => {
          setReceipts((prev) => prev.filter((item) => item.id !== id));
          return "ลบใบเสร็จรับเงินเรียบร้อยแล้ว";
        },
        error: "เกิดข้อผิดพลาดในการลบ",
      });
    }
  };

  const handleViewClick = useCallback(async (receipt: ReceiptItem) => {
    console.log("[DEBUG] handleViewClick - receipt:", {
      id: receipt.id,
      number: receipt.number,
      customer: receipt.customer,
    });
    try {
      const fullDoc = await apiService.getDocumentById(receipt.id);
      if (fullDoc) {
        setSelectedReceipt(fullDoc);
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
      case "ร่าง":
        return "bg-gray-100 text-gray-700";
      case "ชำระแล้ว":
        return "bg-green-100 text-green-700";
      case "ชำระบางส่วน":
        return "bg-orange-100 text-orange-700";
      case "ยกเลิก":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center">
            <ReceiptIcon className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ใบเสร็จรับเงิน
            </h1>
            <p className="text-gray-400">จัดการใบเสร็จรับเงินทั้งหมด</p>
          </div>
        </div>
        <Link to="/documents/receipt/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            สร้างใบเสร็จใหม่
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบเสร็จ..."
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
            { value: "ร่าง", label: "ร่าง" },
            { value: "ชำระแล้ว", label: "ชำระแล้ว" },
            { value: "ชำระบางส่วน", label: "ชำระบางส่วน" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>รายการใบเสร็จรับเงิน</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filters.status !== "all" ||
              filters.dateFrom ||
              filters.dateTo ||
              searchText
                ? `พบ ${filteredAndSortedReceipts.length} ฉบับ จากทั้งหมด ${receipts.length} ฉบับ`
                : `${receipts.length} ฉบับ`}
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
                  {pagedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          ยังไม่มีใบเสร็จรับเงิน
                        </h3>
                        <p>เริ่มต้นสร้างใบเสร็จใหม่ได้เลย</p>
                      </td>
                    </tr>
                  ) : (
                    pagedData.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {item.number}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.customer}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.date}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {formatCurrency(item.netTotal)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 no-print">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewClick(item)}
                            >
                              ดู
                            </Button>
                            <Button
                              size="sm"
                              className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                              onClick={() => handleEditClick(item.id)}
                            >
                              แก้ไข
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteClick(item.id)}
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

      {isModalOpen && selectedReceipt && (
        <ReceiptModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          receipt={selectedReceipt}
        />
      )}

      <div className="flex justify-center mt-4 gap-1">
        <button
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
          className="px-2"
        >
          ก่อนหน้า
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((i) => i === 1 || i === totalPages || Math.abs(i - page) <= 2)
          .map((i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`px-2 ${page === i ? "font-bold underline" : ""}`}
            >
              {i}
            </button>
          ))}
        <button
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
          className="px-2"
        >
          ถัดไป
        </button>
      </div>
    </div>
  );
};

export default Receipt;
