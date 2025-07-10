import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
  Plus,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import type { Document } from "@/types/document";
import ReceiptModal from "../sub/receipt/ReceiptModal";
import { toast } from "sonner";
import DocumentFilter from "../../components/DocumentFilter";
import { Link, Routes, Route } from "react-router-dom";
import ReceiptForm from "../sub/receipt/ReceiptForm";

const Receipt = () => {
  const [receipts, setReceipts] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }>({});

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setLoading(true);
        console.log("Loading receipts...");
        const data = await apiService.getDocuments();
        console.log("Documents loaded:", data.length);

        // กรองใบเสร็จที่ไม่มีเลขที่เอกสารจริง (mock) ออก
        const receiptsData = data
          .filter((doc) => doc.document_type === "RECEIPT")
          .filter(
            (doc) =>
              doc.document_number &&
              /^RE-\d{4}-\d{4}$/.test(doc.document_number)
          )
          .map((doc) => ({
            ...doc,
            total_amount: Number(doc.total_amount),
          }));

        console.log("Filtered receipts:", receiptsData.length);
        setReceipts(receiptsData);
      } catch (err) {
        console.error("Error loading receipts:", err);
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    loadReceipts();
  }, []);

  const handleViewClick = (receipt: Document) => {
    setSelectedReceipt(receipt);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: number) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await apiService.deleteDocument(id.toString());
        setReceipts((prevReceipts) =>
          prevReceipts.filter((receipt) => receipt.id !== id)
        );
        toast.success("ลบใบเสร็จรับเงินเรียบร้อยแล้ว");
      } catch (error) {
        console.error("Failed to delete receipt:", error);
        toast.error("เกิดข้อผิดพลาดในการลบใบเสร็จรับเงิน");
        setError((error as Error).message);
      }
    }
  };

  const handleEditClick = (receipt: Document) => {
    // ถ้าไม่มีเลขที่เอกสารจริง (mock) ให้แจ้งเตือนและไม่ให้แก้ไข
    if (
      !receipt.document_number ||
      !/^RE-\d{4}-\d{4}$/.test(receipt.document_number)
    ) {
      toast.warning(
        "ใบเสร็จนี้ยังไม่ได้บันทึกลงระบบ เลขที่เอกสารจะถูกกำหนดหลังบันทึก"
      );
      return;
    }
    window.location.href = `/documents/receipt/edit/${receipt.id}`;
  };

  const mapApiStatusToModalStatus = (
    status: string
  ): "รอชำระเงิน" | "ชำระเงินแล้ว" | "ยกเลิก" | "คืนเงิน" | "รอตรวจสอบ" => {
    switch (status) {
      case "ชำระเงินแล้ว":
      case "PAID":
        return "ชำระเงินแล้ว";
      case "ยกเลิก":
      case "CANCELLED":
        return "ยกเลิก";
      case "คืนเงิน":
      case "REFUNDED":
        return "คืนเงิน";
      default:
        return "รอตรวจสอบ";
    }
  };

  const mapReceiptForModal = (receipt: Document | null) => {
    if (!receipt) return null;
    return {
      id: receipt.document_number,
      client: receipt.customer_name,
      created_at: new Date(receipt.issue_date).toLocaleDateString("th-TH"),
      order_date: new Date(receipt.issue_date).toLocaleDateString("th-TH"),
      amount: new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
      }).format(receipt.total_amount),
      status: mapApiStatusToModalStatus(receipt.status),
      items: (receipt.items || []).map((item) => ({
        title: item.productTitle,
        qty: item.quantity,
        price: item.unitPrice,
        total: item.amount,
      })),
      address: receipt.customer_address,
      tel: receipt.customer_phone,
      paymentMethod: receipt.payment_method,
      shippingCost: receipt.shipping_cost,
    };
  };

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

  // Helper แปลง yyyy-MM-dd หรือ yyyy-MM-ddTHH:mm:ss.sssZ string เป็น Date แบบ local (robust)
  function parseLocalDate(str: string): Date | null {
    if (!str) return null;
    // ตัดเวลาออกถ้ามี
    const datePart = str.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    const date = new Date(y, m - 1, d);
    return isNaN(date.getTime()) ? null : date;
  }

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
      dateObj = new Date(Number(y), Number(m) - 1, Number(day));
    }
    if (!dateObj || isNaN(dateObj.getTime())) return "";
    return dateObj.toISOString().slice(0, 10);
  };

  const filteredReceipts = receipts.filter((r) => {
    if (
      filters.status &&
      filters.status !== "all" &&
      r.status !== filters.status
    ) {
      return false;
    }
    // กรองวันที่สร้าง (>= dateFrom)
    if (filters.dateFrom) {
      const filterDate = new Date(
        filters.dateFrom.getFullYear(),
        filters.dateFrom.getMonth(),
        filters.dateFrom.getDate()
      );
      const docDate = parseLocalDate(r.issue_date);
      // debug log
      console.log(
        "docDate",
        r.issue_date,
        typeof r.issue_date,
        "parsed",
        docDate,
        "filterDate",
        filterDate,
        typeof filterDate
      );
      if (!docDate) {
        console.log("SKIP: docDate invalid", r.issue_date);
        return false;
      }
      if (docDate.getTime() < filterDate.getTime()) {
        console.log("SKIP: docDate", docDate, "< filterDate", filterDate);
        return false;
      }
    }
    // กรองวันที่สร้าง (<= dateTo)
    if (
      filters.dateTo &&
      toDateOnly(r.issue_date) > toDateOnly(filters.dateTo)
    ) {
      return false;
    }
    return true;
  });

  // หลัง filter
  console.log("FILTER", filters.dateFrom, typeof filters.dateFrom);
  console.log("AFTER FILTER", filteredReceipts.length);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">
                    ใบเสร็จรับเงิน
                  </h1>
                  <p className="text-gray-400">จัดการใบเสร็จรับเงินทั้งหมด</p>
                </div>
              </div>
              <Link to="/documents/receipt/new">
                <Button className="flex items-center gap-2" variant="default">
                  <Plus className="w-4 h-4" />
                  สร้างใบเสร็จใหม่
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
                    placeholder="ค้นหาใบเสร็จรับเงิน..."
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <DocumentFilter
                onFilterChange={setFilters}
                initialFilters={filters}
                statusOptions={[
                  { value: "all", label: "ทั้งหมด" },
                  { value: "ชำระแล้ว", label: "ชำระแล้ว" },
                  { value: "ยกเลิก", label: "ยกเลิก" },
                ]}
              />
            </div>

            {/* Content */}
            <Card className="border border-border/40">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>ใบเสร็จรับเงิน</CardTitle>
                </div>
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
                ) : filteredReceipts.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <CreditCard className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold">
                      ยังไม่มีใบเสร็จรับเงิน
                    </h3>
                    <p>
                      ใบเสร็จรับเงินจะถูกสร้างโดยอัตโนมัติเมื่อมีการชำระเงิน
                    </p>
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
                        {filteredReceipts.map((receipt) => (
                          <tr
                            key={receipt.id}
                            className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-foreground">
                              {receipt.document_number}
                            </td>
                            <td className="py-3 px-4 text-foreground">
                              {receipt.customer_name}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(receipt.issue_date).toLocaleDateString(
                                "en-GB"
                              )}
                            </td>
                            <td className="py-3 px-4 font-medium text-foreground">
                              {new Intl.NumberFormat("th-TH", {
                                style: "currency",
                                currency: "THB",
                              }).format(receipt.total_amount)}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                                  receipt.status
                                )}`}
                              >
                                {receipt.status}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewClick(receipt)}
                                >
                                  ดู
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClick(receipt)}
                                >
                                  แก้ไข
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteClick(receipt.id)}
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

            <ReceiptModal
              open={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              receipt={selectedReceipt}
            />
          </div>
        }
      />
      <Route path="new" element={<ReceiptForm editMode={false} />} />
      <Route path="edit/:id" element={<ReceiptForm editMode={true} />} />
    </Routes>
  );
};

export default Receipt;
