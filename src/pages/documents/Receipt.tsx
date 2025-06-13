import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchOrderCodes } from "../services/order";
import { Button } from "@/components/ui/button";
import { CreditCard, Plus, Search, Filter, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import ReceiptDetailsModal from "./components/ReceiptDetailsModal";
import { getToken, getAccessToken } from "@/pages/services/auth";

const API_BASE_URL = 'https://openapi.ketshoptest.com';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

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

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      
      // Fetch orders from the API
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const orders: Order[] = await response.json();
      
      // Transform orders to receipts
      const formattedReceipts = orders.map((order) => ({
        id: order.id,
        client: order.customerName || 'ไม่ระบุชื่อลูกค้า',
        date: new Date(order.createdAt).toLocaleDateString('th-TH'),
        dueDate: new Date(order.createdAt).toLocaleDateString('th-TH'),
        amount: `฿${order.totalAmount.toFixed(2)}`,
        status: mapOrderStatus(order.status),
        orderData: order, // Store full order data for details
      }));

      setReceipts(formattedReceipts);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(`เกิดข้อผิดพลาด: ${err.message || 'ไม่สามารถโหลดข้อมูลใบเสร็จได้'}`);
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialize and fetch orders
    const initialize = async () => {
      try {
        await fetchOrders();
      } catch (error) {
        console.error('Initialization error:', error);
        setError('ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง');
      }
    };

    initialize();
  }, []);

  const mapOrderStatus = (status: string): Receipt["status"] => {
    const statusMap: Record<string, Receipt["status"]> = {
      completed: "ชำระแล้ว",
      pending: "ส่งแล้ว",
      overdue: "เกินกำหนด",
      draft: "รอดำเนินการ",
    };
    return statusMap[status] || "รอดำเนินการ";
  };

  const fetchReceipts = async () => {
    try {
      console.log('Fetching token...');
      const token = await getToken();
      console.log('Token received, fetching orders...');
      
      // Fetch orders directly from the API
      const response = await fetch('https://openapi.ketshopweb.com/api/orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch orders:', response.status, errorText);
        throw new Error(`ไม่สามารถโหลดข้อมูล: ${response.status} ${response.statusText}`);
      }

      const orders = await response.json();
      console.log('Orders data:', orders);

      if (!Array.isArray(orders) || orders.length === 0) {
        console.warn('No orders found');
        setError('ไม่พบข้อมูลใบเสร็จ');
        setReceipts([]);
        return;
      }

      // Transform orders to receipts
      const formattedReceipts = orders.map((order: any) => ({
        id: order.id || order.order_id || '',
        client: order.customer_name || order.name || 'ไม่ระบุชื่อลูกค้า',
        date: order.order_date ? new Date(order.order_date).toLocaleDateString('th-TH') : 'ไม่ระบุวันที่',
        dueDate: order.due_date ? new Date(order.due_date).toLocaleDateString('th-TH') : 'ไม่ระบุกำหนดชำระ',
        amount: order.total ? `฿${Number(order.total).toLocaleString('th-TH')}` : '฿0',
        status: mapOrderStatus(order.status || ''),
        imageUrl: order.receipt_image_url || '',
      }));

      console.log('Formatted receipts:', formattedReceipts);
      setReceipts(formattedReceipts);
      setError(null);
    } catch (err: any) {
      console.error('Error in fetchReceipts:', err);
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูลใบเสร็จ');
      setReceipts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, []);

  const handleOpen = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setOpen(true);
  };

  const handleCreateReceipt = () => {
    alert("Create Receipt functionality is not yet implemented.");
  };

  const handleEditReceipt = (receipt: Receipt) => {
    alert(`Edit Receipt ${receipt.id} functionality is not yet implemented.`);
  };

  const handleReload = () => {
    setError(null);
    setIsLoading(true);
    fetchReceipts();
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
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleReload} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            โหลดใหม่
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={handleCreateReceipt}
          >
            <Plus className="w-4 h-4" />
            สร้างใบเสร็จใหม่
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
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

      {/* Receipt Table */}
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
                        >
                          ดู
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
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

      {receipts.length === 0 && !isLoading && (
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
