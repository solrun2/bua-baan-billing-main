import { useState, useEffect, useCallback, useMemo } from "react";
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
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter"; // ✅ Import DocumentFilter อย่างเดียว
import { Skeleton } from "@/components/ui/skeleton";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";

// สร้าง Type เพื่อความชัดเจนของข้อมูล
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
  documentDate: string; // รับค่าเป็น 'YYYY-MM-DD' จาก API
}

// ✅ ย้ายฟังก์ชัน parseLocalDate มาไว้นอก Component เพื่อประสิทธิภาพที่ดีกว่า
// และแก้ปัญหาเรื่อง Timezone โดยแปลงวันที่ให้เป็น UTC เสมอ
const parseLocalDate = (str: string): Date | null => {
  if (!str) return null;
  const datePart = str.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return null;
  // สร้าง Date object ในรูปแบบ UTC เพื่อให้การเปรียบเทียบไม่ผิดเพี้ยน
  const date = new Date(Date.UTC(y, m - 1, d));
  return isNaN(date.getTime()) ? null : date;
};

const Quotation = () => {
  const navigate = useNavigate();

  const handleCreateNew = () => {
    console.log("[Quotation] สร้างใบเสนอราคาใหม่");
    navigate("/documents/quotation/new");
  };

  const [quotations, setQuotations] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: Date | null;
    dateTo?: Date | null;
  }>({});
  const [searchText, setSearchText] = useState("");

  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  useEffect(() => {
    const loadQuotations = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        const quotationsData = data
          .filter((doc) => doc.document_type === "QUOTATION")
          .map((doc: any): QuotationItem => {
            const netTotal =
              doc.summary?.netTotalAmount ?? Number(doc.total_amount ?? 0);
            return {
              id: doc.id,
              number: doc.document_number,
              customer: doc.customer_name,
              date: new Date(doc.issue_date).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
              }),
              dateValue: new Date(doc.issue_date).getTime(),
              validUntil: doc.valid_until
                ? new Date(doc.valid_until).toLocaleDateString("th-TH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-",
              validUntilValue: doc.valid_until
                ? new Date(doc.valid_until).getTime()
                : 0,
              netTotal: netTotal,
              status: doc.status,
              documentDate: doc.issue_date,
            };
          });
        setQuotations(quotationsData);
      } catch (err) {
        console.error("[Quotation] เกิดข้อผิดพลาดในการโหลดข้อมูล:", err);
        setError("ไม่สามารถโหลดข้อมูลใบเสนอราคาได้");
        toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล");
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
        return "bg-yellow-100 text-yellow-700";
      case "ยกเลิก":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const handleViewClick = useCallback(async (quotation: QuotationItem) => {
    try {
      toast.loading("กำลังโหลดข้อมูล...");
      const allDocs = await apiService.getDocuments();
      toast.dismiss();
      const fullDoc = allDocs.find((doc: any) => doc.id === quotation.id);

      if (fullDoc) {
        setSelectedQuotation(fullDoc);
        setIsModalOpen(true);
      } else {
        toast.error("ไม่พบข้อมูลเอกสาร");
      }
    } catch (err) {
      toast.dismiss();
      console.error("[Quotation] เกิดข้อผิดพลาดในการดูรายละเอียด:", err);
      toast.error("ไม่สามารถดูรายละเอียดได้");
    }
  }, []);

  const handleEditClick = (id: string) => {
    navigate(`/documents/quotation/edit/${id}`);
  };

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบใบเสนอราคานี้?")) {
      try {
        toast.loading("กำลังลบ...");
        await apiService.deleteDocument(id);
        setQuotations((prev) => prev.filter((q) => q.id !== id));
        toast.success("ลบใบเสนอราคาเรียบร้อยแล้ว");
      } catch (error) {
        toast.dismiss();
        console.error("[Quotation] เกิดข้อผิดพลาดในการลบ:", error);
        toast.error("เกิดข้อผิดพลาดในการลบใบเสนอราคา");
      }
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const filteredAndSortedQuotations = useMemo(() => {
    let result = searchData(quotations, searchText, ["number", "customer"]);

    result = result.filter((q) => {
      const isStatusMatch =
        !filters.status ||
        filters.status === "all" ||
        q.status === filters.status;
      if (!isStatusMatch) return false;

      // ✨✨ ใช้ฟังก์ชัน parseLocalDate ที่ประกาศไว้ด้านบน ✨✨
      const docDate = parseLocalDate(q.documentDate);
      const isAfterFrom =
        !filters.dateFrom || !docDate || docDate >= filters.dateFrom;
      const isBeforeTo =
        !filters.dateTo || !docDate || docDate <= filters.dateTo;

      return isAfterFrom && isBeforeTo;
    });

    return sortData(result, sortColumn as keyof QuotationItem, sortDirection);
  }, [quotations, searchText, filters, sortColumn, sortDirection]);

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

      <div className="flex flex-col md:flex-row items-center gap-4 no-print">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่เอกสาร, ชื่อลูกค้า..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
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
            <div className="flex justify-center items-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          ) : filteredAndSortedQuotations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ไม่พบใบเสนอราคา</h3>
              <p>
                {searchText || filters.status || filters.dateFrom
                  ? "ลองเปลี่ยนเงื่อนไขการค้นหาหรือตัวกรอง"
                  : "เริ่มต้นสร้างใบเสนอราคาใหม่ได้เลย"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
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
                        {sortColumn === key ? (
                          <span>{sortDirection === "asc" ? "▲" : "▼"}</span>
                        ) : (
                          <span className="text-gray-300">⇅</span>
                        )}
                      </th>
                    ))}
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground no-print">
                      การดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedQuotations.map((quotation) => (
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
                        {quotation.date}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {quotation.validUntil}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground text-right">
                        {formatCurrency(quotation.netTotal)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(quotation.status)}`}
                        >
                          {quotation.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 no-print">
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
        </CardContent>
      </Card>

      {isModalOpen && selectedQuotation && (
        <QuotationModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedQuotation(null);
          }}
          quotation={selectedQuotation}
        />
      )}
    </div>
  );
};

export default Quotation;
