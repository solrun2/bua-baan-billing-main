import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, Filter } from "lucide-react";
import { QuotationForm } from "@/components/forms/QuotationForm";
const Quotation = () => {
  const [showForm, setShowForm] = useState(false);
  const quotations = [{
    id: "QT-2024-001",
    client: "บริษัท ABC จำกัด",
    date: "2024-01-15",
    amount: "฿50,000",
    status: "รอการอนุมัติ"
  }, {
    id: "QT-2024-002",
    client: "บริษัท XYZ จำกัด",
    date: "2024-01-14",
    amount: "฿75,000",
    status: "อนุมัติแล้ว"
  }, {
    id: "QT-2024-003",
    client: "บริษัท DEF จำกัด",
    date: "2024-01-13",
    amount: "฿30,000",
    status: "ยกเลิก"
  }, {
    id: "QT-2024-004",
    client: "บริษัท GHI จำกัด",
    date: "2024-01-12",
    amount: "฿120,000",
    status: "ร่าง"
  }];
  if (showForm) {
    return <QuotationForm onCancel={() => setShowForm(false)} />;
  }
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ใบเสนอราคา</h1>
            <p className="text-gray-400">จัดการใบเสนอราคาทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" />
          สร้างใบเสนอราคาใหม่
        </Button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ค้นหาใบเสนอราคา..." className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20" />
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
          <CardTitle>รายการใบเสนอราคา</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">เลขที่</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">วันที่</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">จำนวนเงิน</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">สถานะ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((quotation, index) => <tr key={index} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{quotation.id}</td>
                    <td className="py-3 px-4 text-foreground">{quotation.client}</td>
                    <td className="py-3 px-4 text-muted-foreground">{quotation.date}</td>
                    <td className="py-3 px-4 font-medium text-foreground">{quotation.amount}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${quotation.status === 'อนุมัติแล้ว' ? 'bg-green-100 text-green-700' : quotation.status === 'รอการอนุมัติ' ? 'bg-yellow-100 text-yellow-700' : quotation.status === 'ยกเลิก' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                        {quotation.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">ดู</Button>
                        <Button variant="outline" size="sm">แก้ไข</Button>
                      </div>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Quotation;