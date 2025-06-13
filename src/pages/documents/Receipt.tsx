import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import ReceiptDetailsModal from "./components/ReceiptDetailsModal";

interface Receipt {
  id: string;
  client: string;
  date: string;
  dueDate: string;
  amount: string;
  status: "ชำระแล้ว" | "ส่งแล้ว" | "เกินกำหนด" | "รอดำเนินการ";
  imageUrl?: string;
}

const Receipt = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://openapi.ketshoptest.com/orders")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch receipts");
        }
        return response.json();
      })
      .then((data) => {
        console.log("API Response:", data);
        const transformedData = data.map((order: any) => ({
          id: order.order_id,
          client: order.customer_name,
          date: new Date(order.created_at).toLocaleDateString(),
          amount: `฿${order.total_amount.toLocaleString()}`,
          status: mapOrderStatus(order.status),
          dueDate: new Date(order.due_date || Date.now()).toLocaleDateString(),
          imageUrl: order.receipt_image_url,
        }));
        setReceipts(transformedData);
      })
      .catch((error) => {
        console.error("Error fetching receipts:", error);
        setError(error.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const mapOrderStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      completed: "ชำระแล้ว",
      pending: "ส่งแล้ว",
      overdue: "เกินกำหนด",
      draft: "รอดำเนินการ",
    };
    return statusMap[status] || status;
  };

  const handleOpen = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setOpen(true);
  };

  const handleCreateReceipt = async () => {
    alert("Create Receipt functionality is not yet implemented.");
  };

  const handleEditReceipt = (receipt: Receipt) => {
    alert(`Edit Receipt ${receipt.id} functionality is not yet implemented.`);
  };

  return (
    <div className="space-y-6">
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
        <Button
          className="flex items-center gap-2"
          onClick={handleCreateReceipt}
        >
          <Plus className="w-4 h-4" />
          สร้างใบเสร็จใหม่
        </Button>
      </div>

      {/* Actions */}
      {receipts.length > 0 && (
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
      )}

      {/* Receipt Table */}
      {receipts.length > 0 && (
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>รายการใบเสร็จรับเงิน</CardTitle>
          </CardHeader>
          <CardContent>
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
                  {receipts.map((receipt, index) => (
                    <tr
                      key={index}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {receipt.id}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {receipt.client}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {receipt.date}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {receipt.dueDate}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {receipt.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            receipt.status === "ชำระแล้ว"
                              ? "bg-green-100 text-green-700"
                              : receipt.status === "ส่งแล้ว"
                              ? "bg-blue-100 text-blue-700"
                              : receipt.status === "เกินกำหนด"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {receipt.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpen(receipt)}
                            className="flex items-center"
                          >
                            ดู
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => handleEditReceipt(receipt)}
                          >
                            แก้ไข
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Receipts Placeholder */}
      {receipts.length === 0 && (
        <Card className="border border-border/40">
          <CardContent className="p-8">
            <div className="text-center text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                ยังไม่มีใบเสร็จรับเงิน
              </h3>
              <p>เริ่มสร้างใบเสร็จรับเงินแรกของคุณ</p>
            </div>
          </CardContent>
        </Card>
      )}

      <ReceiptDetailsModal
        open={open}
        setOpen={setOpen}
        receipt={selectedReceipt}
      />
    </div>
  );
};

export default Receipt;
