import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ClipboardList as BillingIcon,
  Plus,
  Search,
  AlertTriangle,
  Loader2,
  FileText,
  Trash2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import BillingModal from "@/pages/sub/billing/BillingModal";
import { formatCurrency } from "../../lib/utils";
import DocumentFilter from "../../components/DocumentFilter";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/ui/pagination";

interface BillingItem {
  id: string;
  number: string;
  customer: string;
  date: string;
  dateValue: number;
  netTotal: number;
  status: string;
  documentDate: string;
}

const Billing = () => {
  const navigate = useNavigate();
  const [selectedBilling, setSelectedBilling] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
  }>({ status: "all", dateFrom: null, dateTo: null });
  const [searchText, setSearchText] = useState("");
  const [sortColumn, setSortColumn] = useState<string>("dateValue");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Use pagination hook
  const {
    data: billings,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    setPage,
    refresh,
  } = usePagination<any>("BILLING", filters, searchText);

  // Transform data to BillingItem format
  const billingItems: BillingItem[] = billings.map((doc: any): BillingItem => {
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
    navigate(`/documents/billing/edit/${id}`);

  const handleCancelClick = async (id: string) => {
    if (
      window.confirm(
        "คุณต้องการยกเลิกใบวางบิลนี้ใช่หรือไม่?\n\nหมายเหตุ: การยกเลิกเอกสารลูกจะทำให้เอกสารแม่ถูกยกเลิกอัตโนมัติ"
      )
    ) {
      toast.promise(apiService.cancelDocument(id), {
        loading: "กำลังยกเลิก...",
        success: (result) => {
          refresh();
          let message = "ยกเลิกใบวางบิลเรียบร้อยแล้ว";
          if (result.relatedDocumentsCancelled > 0) {
            message += ` (เอกสารที่เกี่ยวข้องถูกยกเลิก ${result.relatedDocumentsCancelled} รายการ)`;
          }
          return message;
        },
        error: "เกิดข้อผิดพลาดในการยกเลิก",
      });
    }
  };

  const handleViewClick = useCallback(async (billing: BillingItem) => {
    try {
      const fullDoc = await apiService.getDocumentById(billing.id);
      if (fullDoc) {
        setSelectedBilling(fullDoc);
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
      case "วางบิลแล้ว":
        return "bg-green-100 text-green-700";
      case "รอวางบิล":
        return "bg-yellow-100 text-yellow-700";
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
          <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
            <BillingIcon className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบวางบิล</h1>
            <p className="text-gray-400">จัดการใบวางบิลทั้งหมด</p>
          </div>
        </div>
        <Link to="/documents/billing/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            สร้างใบวางบิลใหม่
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบวางบิล..."
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
            { value: "รอวางบิล", label: "รอวางบิล" },
            { value: "วางบิลแล้ว", label: "วางบิลแล้ว" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <CardTitle>รายการใบวางบิล</CardTitle>
            <div className="text-sm text-muted-foreground">
              {filters.status !== "all" ||
              filters.dateFrom ||
              filters.dateTo ||
              searchText
                ? `พบ ${totalCount} ฉบับ`
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
                  {billingItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-10 text-muted-foreground"
                      >
                        <FileText className="w-12 h-12 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold">
                          ยังไม่มีใบวางบิล
                        </h3>
                        <p>เริ่มต้นสร้างใบวางบิลใหม่ได้เลย</p>
                      </td>
                    </tr>
                  ) : (
                    billingItems.map((item) => (
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
                              onClick={() => handleCancelClick(item.id)}
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

      {isModalOpen && selectedBilling && (
        <BillingModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          billing={selectedBilling}
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

export default Billing;
