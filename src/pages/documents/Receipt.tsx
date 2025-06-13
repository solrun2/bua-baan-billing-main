import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Search, Filter } from "lucide-react";
import { useState, useEffect } from "react";
import ReceiptDetailsModal from "./components/ReceiptDetailsModal";
import { getToken } from "@/pages/services/auth";

interface Receipt {
  id: string;
  client: string;
  created_at: string;
  order_date: string;
  amount: string;
  status: "รอชำระเงิน" | "ชำระเงินแล้ว" | "ยกเลิก" | "คืนเงิน" | "รอตรวจสอบ";
  imageUrl?: string;
  items?: Array<{
    title: string;
    qty: number;
    price: number;
    total: number;
  }>;
  address?: string;
  tel?: string;
  paymentMethod?: string;
}

const Receipt = () => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setIsLoading(true);

        // Get the token first
        const token = await getToken();

        // Log the token for debugging (remove in production)
        console.log("Using token:", token);

        // Fetch specific order
        const orderResponse = await fetch(
          "https://openapi.ketshoptest.com/order/get/2506000042",
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          console.error("API Error Response:", errorText);
          throw new Error(
            `ไม่สามารถโหลดข้อมูลใบเสร็จ: ${orderResponse.status} ${orderResponse.statusText}`
          );
        }

        const orderData = await orderResponse.json();
        console.log("API Response Data:", orderData); // Log the response data

        if (!orderData) {
          throw new Error("ไม่พบข้อมูลใบเสร็จ");
        }

        // Transform the order data to match our Receipt interface
        const receipt: Receipt = {
          id: orderData.ordercode || orderData.id?.toString() || "",
          client: orderData.name || "ไม่ระบุชื่อลูกค้า",
          created_at: orderData.order_date
            ? new Date(orderData.order_date).toLocaleDateString("th-TH")
            : "ไม่ระบุวันที่",
          order_date: orderData.due_date
            ? new Date(orderData.due_date).toLocaleDateString("th-TH")
            : "ไม่ระบุ",
          amount:
            `฿${orderData.totals?.toLocaleString("th-TH", {
              minimumFractionDigits: 2,
            })}` || "฿0",
          status: mapOrderStatus(orderData.status?.toString() || "1"),
          imageUrl: orderData.details?.[0]?.feature_img || "",
          items:
            orderData.details?.map((item: any) => ({
              title: item.title,
              qty: item.qty,
              price: item.price,
              total: item.qty * item.price,
            })) || [],
          address: [
            orderData.address1,
            orderData.address2,
            orderData.subdistrict,
            orderData.district,
            orderData.province,
            orderData.zipcode,
          ]
            .filter(Boolean)
            .join(" "),
          tel: orderData.tel || "",
          paymentMethod: orderData.payment_name || "ไม่ระบุ",
        };

        console.log("Transformed Receipt:", receipt); // Log the transformed data
        setReceipts([receipt]);
      } catch (error) {
        console.error("Error in fetchOrder:", error);
        setError(
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrder();
  }, []);

  const mapOrderStatus = (status: string | number): Receipt["status"] => {
    const statusMap: Record<string | number, Receipt["status"]> = {
      // Numeric status codes
      1: "รอชำระเงิน",
      2: "ชำระเงินแล้ว",
      3: "ยกเลิก",
      4: "คืนเงิน",
      5: "รอตรวจสอบ",
      // String status codes
      pending: "รอชำระเงิน",
      paid: "ชำระเงินแล้ว",
      cancelled: "ยกเลิก",
      refunded: "คืนเงิน",
      review: "รอตรวจสอบ",
    };
    return statusMap[status] || "รอชำระเงิน";
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
                        {receipt.created_at}
                      </td>
                      <td className="py-3 px-4 font-medium text-foreground">
                        {receipt.amount}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            receipt.status === "รอชำระเงิน"
                              ? "bg-blue-100 text-blue-700"
                              : receipt.status === "ชำระเงินแล้ว"
                              ? "bg-green-100 text-green-700"
                              : receipt.status === "ยกเลิก"
                              ? "bg-red-100 text-red-700"
                              : receipt.status === "คืนเงิน"
                              ? "bg-orange-100 text-orange-700"
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
