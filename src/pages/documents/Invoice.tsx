import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import { documentService } from "@/pages/services/documentService";
import { toast } from "sonner";
import { formatCurrency } from "../../lib/utils";
import InvoiceModal from "../sub/invoice/InvoiceModal";
import { DocumentForm } from "../sub/create/DocumentForm";
import InvoiceForm from "../sub/invoice/InvoiceForm";
import DocumentFilter from "../../components/DocumentFilter";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const Invoice = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editInvoiceData, setEditInvoiceData] = useState<any | null>(null);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }>({});

  // Helper แปลงวันที่ dd/mm/yyyy (พ.ศ./ค.ศ.) เป็น yyyy-mm-dd (ค.ศ.)
  const toISO = (dateStr: string | undefined) => {
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

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        console.log("[Invoice] เริ่มโหลดข้อมูลใบแจ้งหนี้");
        setLoading(true);
        const data = await apiService.getDocuments();
        const invoicesData = data
          .filter((doc) => doc.document_type === "INVOICE")
          .map((doc) => ({
            ...doc,
            number: doc.document_number,
            customer: doc.customer_name,
            documentDate: doc.issue_date,
            dueDate: doc.due_date,
            total_amount: Number(doc.total_amount),
            status: doc.status,
          }));
        setInvoices(invoicesData);
        console.log("[Invoice] โหลดข้อมูลสำเร็จ:", {
          total: data.length,
          invoices: invoicesData.length,
        });
        // log all documentDate
        console.log(
          "[Invoice] วันที่เอกสารทั้งหมด:",
          invoicesData.map((i) => i.documentDate)
        );
      } catch (err) {
        console.error("[Invoice] เกิดข้อผิดพลาดในการโหลดข้อมูล:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    loadInvoices();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ชำระแล้ว":
        return "bg-green-100 text-green-700";
      case "พ้นกำหนด":
        return "bg-red-100 text-red-700";
      case "รอชำระ":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const handleViewClick = async (invoice: any) => {
    try {
      console.log("[Invoice] ดูรายละเอียดใบแจ้งหนี้:", invoice.number);
      // ดึงข้อมูลเต็มของ invoice จาก backend โดยตรง (ไม่ใช้ allDocs)
      const fullDoc = await apiService.getDocumentById(invoice.id);
      setSelectedInvoice(fullDoc);
      setIsModalOpen(true);
    } catch (error) {
      console.error("[Invoice] เกิดข้อผิดพลาดในการดูรายละเอียด:", error);
      toast.error("ไม่สามารถดูรายละเอียดได้");
    }
  };

  const handleEditClick = (invoice: any) => {
    console.log("[Invoice] แก้ไขใบแจ้งหนี้:", invoice.number);
    navigate(`/documents/invoice/edit/${invoice.id}`);
  };

  const handleEditSave = async (data: any) => {
    try {
      console.log("[Invoice] บันทึกการแก้ไข:", data.documentNumber);
      await apiService.updateDocument(data.id, data);
      toast.success("บันทึกใบแจ้งหนี้สำเร็จ");
      setEditInvoiceData(null);
      // refresh รายการ
      const docs = await apiService.getDocuments();
      const invoicesData = docs
        .filter((doc) => doc.document_type === "INVOICE")
        .map((doc) => ({
          id: doc.id,
          number: doc.document_number,
          customer: doc.customer_name,
          date: new Date(doc.issue_date).toLocaleDateString("th-TH"),
          dueDate: doc.due_date
            ? new Date(doc.due_date).toLocaleDateString("th-TH")
            : "-",
          total_amount: Number(doc.total_amount),
          withholding_tax: Number((doc as any).withholding_tax ?? 0),
          status: doc.status,
        }));
      setInvoices(invoicesData);
      console.log("[Invoice] รีเฟรชข้อมูลสำเร็จ");
    } catch (e) {
      console.error("[Invoice] เกิดข้อผิดพลาดในการบันทึก:", e);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const handleEditCancel = () => {
    console.log("[Invoice] ยกเลิกการแก้ไข");
    setEditInvoiceData(null);
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      try {
        console.log("[Invoice] ลบใบแจ้งหนี้ ID:", id);
        await apiService.deleteDocument(id.toString());
        setInvoices((prevInvoices) =>
          prevInvoices.filter((invoice) => invoice.id !== id)
        );
        toast.success("ลบใบแจ้งหนี้เรียบร้อยแล้ว");
      } catch (error) {
        console.error("[Invoice] เกิดข้อผิดพลาดในการลบ:", error);
        toast.error("เกิดข้อผิดพลาดในการลบใบแจ้งหนี้");
        setError((error as Error).message);
      }
    }
  };

  // Helper เปรียบเทียบวันที่แบบไม่สนใจเวลา (ปลอดภัยกับ invalid date)
  const toDateOnly = (d: string | Date | undefined) => {
    if (!d) return "";
    // รองรับทั้ง string และ Date object
    let dateObj = typeof d === "string" ? new Date(d) : d;
    if (
      typeof d === "string" &&
      d.length === 10 &&
      d.match(/^\d{4}-\d{2}-\d{2}$/)
    ) {
      // ถ้าเป็น yyyy-mm-dd string ให้สร้าง Date แบบ UTC
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

  const handleFilterChange = (newFilters: any) => {
    console.log("[Invoice] เปลี่ยน filter:", newFilters);
    setFilters(newFilters);
  };

  // ฟังก์ชันกรองข้อมูล
  const filteredInvoices = invoices.filter((inv) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      inv.status !== filters.status
    ) {
      return false;
    }
    // กรองวันที่สร้าง (>= dateFrom)
    if (filters.dateFrom) {
      const filterDate = new Date(
        Date.UTC(
          filters.dateFrom.getFullYear(),
          filters.dateFrom.getMonth(),
          filters.dateFrom.getDate()
        )
      );
      const docDate = parseLocalDate(inv.documentDate);
      const docDateStr = docDate ? docDate.toLocaleDateString("en-CA") : "";
      const filterDateStr = filterDate.toLocaleDateString("en-CA");
      console.log(
        "[DEBUG] docDate:",
        inv.documentDate,
        "->",
        docDateStr,
        "| filterDate:",
        filterDateStr
      );
      if (!docDate) {
        console.log("SKIP: docDate invalid", inv.documentDate);
        return false;
      }
      if (docDateStr < filterDateStr) {
        console.log(
          "SKIP: docDateStr < filterDateStr",
          docDateStr,
          filterDateStr
        );
        return false;
      }
    }
    // กรองวันที่กำหนด (<= dateTo)
    if (filters.dateTo && inv.dueDate) {
      const filterDateTo = new Date(
        Date.UTC(
          filters.dateTo.getFullYear(),
          filters.dateTo.getMonth(),
          filters.dateTo.getDate()
        )
      );
      const docDate = parseLocalDate(inv.dueDate);
      const docDateStr = docDate ? docDate.toLocaleDateString("en-CA") : "";
      const filterDateToStr = filterDateTo.toLocaleDateString("en-CA");
      console.log(
        "[DEBUG] (TO) docDate:",
        inv.dueDate,
        "->",
        docDateStr,
        "| filterDateTo:",
        filterDateToStr
      );
      if (!docDate) {
        return false;
      }
      if (docDateStr > filterDateToStr) {
        console.log(
          "SKIP: docDateStr > filterDateToStr",
          docDateStr,
          filterDateToStr
        );
        return false;
      }
    }
    return true;
  });

  // หลัง filter
  console.log("[Invoice] Filter:", filters.dateFrom, typeof filters.dateFrom);
  console.log("[Invoice] หลัง filter:", filteredInvoices.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-orange-600" />
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

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ค้นหาใบแจ้งหนี้..."
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <DocumentFilter
          onFilterChange={handleFilterChange}
          initialFilters={filters}
          statusOptions={[
            { value: "all", label: "ทั้งหมด" },
            { value: "รอชำระ", label: "รอชำระ" },
            { value: "ชำระแล้ว", label: "ชำระแล้ว" },
            { value: "พ้นกำหนด", label: "พ้นกำหนด" },
            { value: "ยกเลิก", label: "ยกเลิก" },
          ]}
        />
      </div>

      {/* Content */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบแจ้งหนี้</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p>เกิดข้อผิดพลาด: {error}</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Receipt className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ยังไม่มีใบแจ้งหนี้</h3>
              <p>เริ่มต้นสร้างใบแจ้งหนี้ใหม่ได้เลย</p>
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
                      กำหนดชำระ
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
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {invoice.number}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {invoice.customer}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {invoice.documentDate
                          ? new Date(invoice.documentDate).toLocaleDateString(
                              "en-GB"
                            )
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {invoice.dueDate
                          ? new Date(invoice.dueDate).toLocaleDateString(
                              "en-GB"
                            )
                          : "-"}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        <span>{formatCurrency(invoice.total_amount)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewClick(invoice)}
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(invoice)}
                          >
                            แก้ไข
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(invoice.id)}
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

      {/* Modal */}
      {selectedInvoice && (
        <InvoiceModal
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedInvoice(null);
          }}
          invoice={selectedInvoice}
        />
      )}

      {/* Edit Form */}
      {editInvoiceData && (
        <InvoiceForm
          initialData={editInvoiceData}
          onSave={handleEditSave}
          onCancel={handleEditCancel}
        />
      )}
    </div>
  );
};

export default Invoice;
