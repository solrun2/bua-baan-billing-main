import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Receipt as InvoiceIcon,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import InvoiceModal from "@/pages/sub/invoice/InvoiceModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format, subDays } from "date-fns"; // ✨ import subDays
import { th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { DOCUMENT_PAGE_SIZE } from "@/constants/documentPageSize";

interface InvoiceItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  dateValue: number;
  dueDate: string;
  dueDateValue: number;
  netTotal: number;
  status: string;
  documentDate: string; // 'YYYY-MM-DD' string
}

const Invoice = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
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
  const filteredAndSortedInvoices = useMemo(() => {
    let result = searchData(invoices, searchText, ["number", "customer"]);
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
    return sortData(result, sortColumn as keyof InvoiceItem, sortDirection);
  }, [invoices, searchText, filters, sortColumn, sortDirection]);

  // 2. pagination
  const [page, setPage] = useState(1);
  const pageSize = DOCUMENT_PAGE_SIZE;
  const totalPages = Math.ceil(filteredAndSortedInvoices.length / pageSize);
  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAndSortedInvoices.slice(start, start + pageSize);
  }, [filteredAndSortedInvoices, page]);

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        const invoicesData = data
          .filter((doc) => doc.document_type === "INVOICE")
          .map((doc: any): InvoiceItem => {
            const issueDate = new Date(doc.issue_date);
            const dueDate = doc.due_date ? new Date(doc.due_date) : null;
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
              dueDate: dueDate
                ? format(dueDate, "d MMM yy", { locale: th })
                : "-",
              dueDateValue: dueDate?.getTime() || 0,
              netTotal,
              status: doc.status,
              documentDate: format(issueDate, "yyyy-MM-dd"),
            };
          });
        setInvoices(invoicesData);
      } catch (err) {
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
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
  const handleEditClick = (id: string) =>
    navigate(`/documents/invoice/edit/${id}`);

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("คุณต้องการลบใบแจ้งหนี้นี้ใช่หรือไม่?")) {
      toast.promise(apiService.deleteDocument(id), {
        loading: "กำลังลบ...",
        success: () => {
          setInvoices((prev) => prev.filter((item) => item.id !== id));
          return "ลบใบแจ้งหนี้เรียบร้อยแล้ว";
        },
        error: "เกิดข้อผิดพลาดในการลบ",
      });
    }
  };

  const handleViewClick = useCallback(async (invoice: InvoiceItem) => {
    toast.promise(apiService.getDocumentById(invoice.id), {
      loading: "กำลังโหลดข้อมูล...",
      success: (fullDoc) => {
        if (fullDoc) {
          setSelectedInvoice(fullDoc);
          setIsModalOpen(true);
        } else {
          toast.error("ไม่พบข้อมูลเอกสาร");
        }
        return "โหลดข้อมูลสำเร็จ";
      },
      error: "ไม่สามารถดูรายละเอียดได้",
    });
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ชำระแล้ว":
        return "bg-green-100 text-green-700";
      case "พ้นกำหนด":
        return "bg-red-100 text-red-700";
      case "รอชำระ":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <InvoiceIcon className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบแจ้งหนี้</h1>
            <p className="text-gray-400">จัดการใบแจ้งหนี้ทั้งหมด</p>
          </div>
        </div>
        <Link to="/documents/invoice/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            สร้างใบแจ้งหนี้ใหม่
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบแจ้งหนี้..."
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
            { value: "รอชำระ", label: "รอชำระ" },
            { value: "ชำระแล้ว", label: "ชำระแล้ว" },
            { value: "พ้นกำหนด", label: "พ้นกำหนด" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>รายการใบแจ้งหนี้</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filters.status !== "all" ||
              filters.dateFrom ||
              filters.dateTo ||
              searchText
                ? `พบ ${filteredAndSortedInvoices.length} ฉบับ จากทั้งหมด ${invoices.length} ฉบับ`
                : `${invoices.length} ฉบับ`}
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
                      { key: "dueDateValue", label: "ครบกำหนด" },
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
                        colSpan={7}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          ยังไม่มีใบแจ้งหนี้
                        </h3>
                        <p>เริ่มต้นสร้างใบแจ้งหนี้ใหม่ได้เลย</p>
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
                        <td className="py-3 px-4 text-muted-foreground">
                          {item.dueDate}
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
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(item.id)}
                            >
                              แก้ไข
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(item.id)}
                            >
                              ลบ
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

      {isModalOpen && selectedInvoice && (
        <InvoiceModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          invoice={selectedInvoice}
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

export default Invoice;
