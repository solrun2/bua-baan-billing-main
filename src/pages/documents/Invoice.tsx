import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Search, Filter } from "lucide-react";
const Invoice = () => {
  const navigate = useNavigate();
  const invoices = [{
    id: "INV-2024-001",
    client: "บริษัท ABC จำกัด",
    date: "2024-01-15",
    amount: "฿50,000",
    status: "ส่งแล้ว",
    dueDate: "2024-02-15"
  }, {
    id: "INV-2024-002",
    client: "บริษัท XYZ จำกัด",
    date: "2024-01-14",
    amount: "฿75,000",
    status: "ชำระแล้ว",
    dueDate: "2024-02-14"
  }, {
    id: "INV-2024-003",
    client: "บริษัท DEF จำกัด",
    date: "2024-01-13",
    amount: "฿30,000",
    status: "เกินกำหนด",
    dueDate: "2024-01-20"
  }, {
    id: "INV-2024-004",
    client: "บริษัท GHI จำกัด",
    date: "2024-01-12",
    amount: "฿120,000",
    status: "ร่าง",
    dueDate: "2024-02-12"
  }];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <Receipt className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบแจ้งหนี้</h1>
            <p className="text-gray-400">จัดการใบแจ้งหนี้ทั้งหมด</p>
          </div>
        </div>
        <Button
          className="flex items-center gap-2"
          onClick={() => navigate("components/CreateInvoice")}
        >
          <Plus className="w-4 h-4" />
          สร้างใบแจ้งหนี้ใหม่
        </Button>
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
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          กรองข้อมูล
        </Button>
      </div>

      {/* Table */}
      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการใบแจ้งหนี้</CardTitle>
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
                {invoices.map((invoice, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-foreground">
                      {invoice.id}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {invoice.client}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {invoice.date}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {invoice.dueDate}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {invoice.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          invoice.status === "ชำระแล้ว"
                            ? "bg-green-100 text-green-700"
                            : invoice.status === "ส่งแล้ว"
                            ? "bg-blue-100 text-blue-700"
                            : invoice.status === "เกินกำหนด"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          ดู
                        </Button>
                        <Button variant="outline" size="sm">
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
    </div>
  );
};
export default Invoice;