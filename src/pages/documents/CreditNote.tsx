import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CircleDollarSign, // Icon for Credit Note
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  FileText,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import CreditNoteModal from "@/pages/sub/credit-note/CreditNoteModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { sortData } from "@/utils/sortUtils";
import { searchData } from "@/utils/searchUtils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditNoteItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  dateValue: number;
  netTotal: number;
  status: string;
  documentDate: string; // 'YYYY-MM-DD' string
}

const CreditNote = () => {
  const navigate = useNavigate();
  const [creditNotes, setCreditNotes] = useState<CreditNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCreditNote, setSelectedCreditNote] = useState<any | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  }>({ status: "all", dateFrom: null, dateTo: null });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const loadCreditNotes = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiService.getDocuments();
        const creditNotesData = data
          .filter((doc: any) => doc.document_type === "CREDIT_NOTE")
          .map((doc: any): CreditNoteItem => {
            const issueDate = new Date(doc.issue_date);
            return {
              id: doc.id,
              number: doc.document_number,
              customer: doc.customer_name,
              date: format(issueDate, "d MMM yy", { locale: th }),
              dateValue: issueDate.getTime(),
              netTotal:
                doc.summary?.netTotalAmount ?? Number(doc.total_amount ?? 0),
              status: doc.status,
              documentDate: format(issueDate, "yyyy-MM-dd"),
            };
          });
        setCreditNotes(creditNotesData);
      } catch (err) {
        console.error("[CreditNote] Load error:", err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    };
    loadCreditNotes();
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
    navigate(`/documents/credit-note/edit/${id}`);

  const handleDeleteClick = async (id: string) => {
    if (window.confirm("คุณต้องการลบใบลดหนี้นี้ใช่หรือไม่?")) {
      toast.promise(apiService.deleteDocument(id), {
        loading: "กำลังลบ...",
        success: () => {
          setCreditNotes((prev) => prev.filter((cn) => cn.id !== id));
          return "ลบใบลดหนี้เรียบร้อยแล้ว";
        },
        error: "เกิดข้อผิดพลาดในการลบ",
      });
    }
  };

  const handleViewClick = useCallback(async (creditNote: CreditNoteItem) => {
    toast.promise(apiService.getDocumentById(creditNote.id), {
      loading: "กำลังโหลดข้อมูล...",
      success: (fullDoc) => {
        if (fullDoc) {
          setSelectedCreditNote(fullDoc);
          setIsModalOpen(true);
        } else {
          toast.error("ไม่พบข้อมูลเอกสาร");
        }
        return "โหลดข้อมูลสำเร็จ";
      },
      error: "ไม่สามารถดูรายละเอียดได้",
    });
  }, []);

  const filteredAndSortedCreditNotes = useMemo(() => {
    let result = searchData(creditNotes, searchText, ["number", "customer"]);

    result = result.filter((cn) => {
      const isStatusMatch =
        !filters.status ||
        filters.status === "all" ||
        cn.status === filters.status;
      if (!isStatusMatch) return false;
      const docDate = cn.documentDate;
      const isAfterFrom =
        !filters.dateFrom || !docDate || docDate >= filters.dateFrom;
      const isBeforeTo =
        !filters.dateTo || !docDate || docDate <= filters.dateTo;
      return isAfterFrom && isBeforeTo;
    });

    return sortData(result, sortColumn as keyof CreditNoteItem, sortDirection);
  }, [creditNotes, searchText, filters, sortColumn, sortDirection]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ใช้งานแล้ว":
        return "bg-green-100 text-green-700";
      case "รอใช้งาน":
        return "bg-yellow-100 text-yellow-700";
      case "ยกเลิก":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <CircleDollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบลดหนี้</h1>
            <p className="text-gray-400">จัดการใบลดหนี้ทั้งหมด</p>
          </div>
        </div>
        <Link to="/documents/credit-note/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            สร้างใบลดหนี้ใหม่
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
              placeholder="ค้นหาใบลดหนี้..."
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
            { value: "รอใช้งาน", label: "รอใช้งาน" },
            { value: "ใช้งานแล้ว", label: "ใช้งานแล้ว" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      {/* Content */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบลดหนี้</CardTitle>
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
                      { key: "netTotal", label: "ยอดเงิน" },
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
                  {filteredAndSortedCreditNotes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          ยังไม่มีใบลดหนี้
                        </h3>
                        <p>เริ่มต้นสร้างใบลดหนี้ใหม่ได้เลย</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedCreditNotes.map((cn) => (
                      <tr
                        key={cn.id}
                        className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          {cn.number}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {cn.customer}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {cn.date}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {formatCurrency(cn.netTotal)}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(cn.status)}`}
                          >
                            {cn.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 no-print">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewClick(cn)}
                            >
                              ดู
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(cn.id)}
                            >
                              แก้ไข
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(cn.id)}
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

      {isModalOpen && selectedCreditNote && (
        <CreditNoteModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          creditNote={selectedCreditNote}
        />
      )}
    </div>
  );
};

export default CreditNote;
