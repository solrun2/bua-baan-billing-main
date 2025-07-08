import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  Search,
  Filter,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { apiService } from "@/pages/services/apiService";
import type { Document } from "@/types/document";
import ReceiptDetailsModal from "@/pages/documents/ReceiptDetailsModal";
import { toast } from "sonner";

const Receipt = () => {
  const [receipts, setReceipts] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedReceipt, setSelectedReceipt] = useState<Document | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const loadReceipts = async () => {
      try {
        setLoading(true);
        const data = await apiService.getDocuments();
        const receiptsData = data
          .filter((doc) => doc.document_type === "RECEIPT")
          .map((doc) => ({
            ...doc,
            total_amount: Number(doc.total_amount),
          }));
        setReceipts(receiptsData);
      } catch (err) {
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
    window.location.href = `/receipts/edit/${receipt.id}`;
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
      case "ส่งแล้ว":
        return "bg-blue-100 text-blue-700";
      case "เกินกำหนด":
        return "bg-red-100 text-red-700";
      case "รอชำระ":
        return "bg-gray-100 text-gray-700";
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
            <CreditCard className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              ใบเสร็จรับเงิน
            </h1>
            <p className="text-gray-400">จัดการใบเสร็จรับเงินทั้งหมด</p>
          </div>
        </div>
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
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          กรองข้อมูล
        </Button>
      </div>

      {/* Content */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบเสร็จรับเงิน</CardTitle>
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
          ) : receipts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4" />
              <h3 className="text-lg font-semibold">ยังไม่มีใบเสร็จรับเงิน</h3>
              <p>ใบเสร็จรับเงินจะถูกสร้างโดยอัตโนมัติเมื่อมีการชำระเงิน</p>
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
                  {receipts.map((receipt) => (
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
                          "th-TH"
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

      <ReceiptDetailsModal
        open={isModalOpen}
        setOpen={setIsModalOpen}
        receipt={mapReceiptForModal(selectedReceipt)}
      />
    </div>
  );
};

export default Receipt;
