import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, AlertTriangle, Loader2 } from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import QuotationModal from "@/pages/sub/quotation/QuotationModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format } from "date-fns";

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
  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: string | null; // <-- รับค่าเป็น string
    dateTo?: string | null; // <-- รับค่าเป็น string
  }>({ status: "all", dateFrom: null, dateTo: null });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        const quotationsData = data
          .filter((doc) => doc.document_type === "QUOTATION")
          .map((doc: any): QuotationItem => {
            const issueDate = new Date(doc.issue_date);
            const validUntilDate = doc.valid_until
              ? new Date(doc.valid_until)
              : null;
            return {
              id: doc.id,
              number: doc.document_number,
              customer: doc.customer_name,
              date: format(issueDate, "d MMM yyyy"),
              dateValue: issueDate.getTime(),
              validUntil: validUntilDate
                ? format(validUntilDate, "d MMM yyyy")
                : "-",
              validUntilValue: validUntilDate?.getTime() || 0,
              netTotal:
                doc.summary?.netTotalAmount ?? Number(doc.total_amount ?? 0),
              status: doc.status,
              documentDate: format(issueDate, "yyyy-MM-dd"), // <-- เก็บเป็น YYYY-MM-DD เสมอ
            };
          });
        setQuotations(quotationsData);
      } catch (err) {
        console.error("[Quotation] Load error:", err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    loadQuotations();
  }, []);

  const handleCreateNew = () => navigate("/documents/quotation/new");
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

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("คุณต้องการลบใบเสนอราคานี้ใช่หรือไม่?")) {
      toast.promise(apiService.deleteDocument(id), {
        loading: "กำลังลบ...",
        success: () => {
          setQuotations((prev) => prev.filter((q) => q.id !== id));
          return "ลบใบเสนอราคาเรียบร้อยแล้ว";
        },
        error: "เกิดข้อผิดพลาดในการลบ",
      });
    }
  };

  const handleViewClick = useCallback(async (quotation: QuotationItem) => {
    toast.promise(apiService.getDocumentById(quotation.id), {
      loading: "กำลังโหลดข้อมูล...",
      success: (fullDoc) => {
        if (fullDoc) {
          setSelectedQuotation(fullDoc);
          setIsModalOpen(true);
        } else {
          toast.error("ไม่พบข้อมูลเอกสาร");
        }
        return "โหลดข้อมูลสำเร็จ";
      },
      error: "ไม่สามารถดูรายละเอียดได้",
    });
  }, []);

  const filteredAndSortedQuotations = useMemo(() => {
    let result = searchData(quotations, searchText, ["number", "customer"]);

    // ✨✨✨ การกรองโดยใช้ String Comparison โดยตรง ✨✨✨
    result = result.filter((q) => {
      const isStatusMatch =
        !filters.status ||
        filters.status === "all" ||
        q.status === filters.status;
      if (!isStatusMatch) return false;

      const docDate = q.documentDate; // 'YYYY-MM-DD'

      const isAfterFrom =
        !filters.dateFrom || !docDate || docDate >= filters.dateFrom;
      const isBeforeTo =
        !filters.dateTo || !docDate || docDate <= filters.dateTo;

      return isAfterFrom && isBeforeTo;
    });

    return sortData(result, sortColumn as keyof QuotationItem, sortDirection);
  }, [quotations, searchText, filters, sortColumn, sortDirection]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "รอตอบรับ":
        return "bg-gray-100 text-gray-700";
      case "ตอบรับแล้ว":
        return "bg-green-100 text-green-700";
      case "พ้นกำหนด":
        return "bg-yellow-100 text-yellow-700";
      case "ยกเลิก":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
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

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบเสนอราคา</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center p-10 text-red-500">
              <AlertTriangle className="mx-auto w-8 h-8 mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredAndSortedQuotations.length === 0 ? (
            <div className="text-center p-10 text-muted-foreground">
              <FileText className="mx-auto w-12 h-12 mb-4" />
              <h3 className="text-lg font-semibold">ไม่พบข้อมูล</h3>
              <p>ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
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
                        className="text-left p-3 font-medium text-muted-foreground cursor-pointer"
                        onClick={() => handleSort(key)}
                      >
                        {label}{" "}
                        {sortColumn === key ? (
                          sortDirection === "asc" ? (
                            "▲"
                          ) : (
                            "▼"
                          )
                        ) : (
                          <span className="text-gray-300">⇅</span>
                        )}
                      </th>
                    ))}
                    <th className="text-left p-3 font-medium text-muted-foreground">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedQuotations.map((q) => (
                    <tr key={q.id} className="border-b hover:bg-muted/40">
                      <td className="p-3 font-medium">{q.number}</td>
                      <td className="p-3">{q.customer}</td>
                      <td className="p-3 text-muted-foreground">{q.date}</td>
                      <td className="p-3 text-muted-foreground">
                        {q.validUntil}
                      </td>
                      <td className="p-3 font-medium text-right">
                        {formatCurrency(q.netTotal)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(q.status)}`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClick(q)}
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(q.id)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteClick(q.id)}
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
        </CardContent>
      </Card>

      {isModalOpen && selectedQuotation && (
        <QuotationModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          quotation={selectedQuotation}
        />
      )}
    </div>
  );
};

export default Quotation;
