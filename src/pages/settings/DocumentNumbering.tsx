import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Settings } from "lucide-react";
const DocumentNumbering = () => {
  const documentTypes = [{
    type: "ใบเสนอราคา",
    prefix: "QT",
    currentNumber: "001",
    format: "QT-YYYY-XXX"
  }, {
    type: "ใบแจ้งหนี้",
    prefix: "INV",
    currentNumber: "156",
    format: "INV-YYYY-XXX"
  }, {
    type: "ใบเสร็จรับเงิน",
    prefix: "RC",
    currentNumber: "089",
    format: "RC-YYYY-XXX"
  }, {
    type: "ใบกำกับภาษี",
    prefix: "TI",
    currentNumber: "067",
    format: "TI-YYYY-XXX"
  }, {
    type: "ใบลดหนี้",
    prefix: "CN",
    currentNumber: "012",
    format: "CN-YYYY-XXX"
  }, {
    type: "ใบสั่งซื้อ",
    prefix: "PO",
    currentNumber: "034",
    format: "PO-YYYY-XXX"
  }, {
    type: "ใบวางบิล",
    prefix: "BL",
    currentNumber: "078",
    format: "BL-YYYY-XXX"
  }];
  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
          <FileText className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">ตั้งค่าเลขรันเอกสาร</h1>
          <p className="text-gray-400">จัดการรูปแบบและเลขรันของเอกสารแต่ละประเภท</p>
        </div>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รูปแบบเลขรันเอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ประเภทเอกสาร</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">รหัสนำหน้า</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">เลขรันปัจจุบัน</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">รูปแบบ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {documentTypes.map((doc, index) => <tr key={index} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{doc.type}</td>
                    <td className="py-3 px-4 font-mono font-medium text-primary">{doc.prefix}</td>
                    <td className="py-3 px-4 font-mono text-foreground">{doc.currentNumber}</td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">{doc.format}</td>
                    <td className="py-3 px-4">
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Settings className="w-3 h-3" />
                        ตั้งค่า
                      </Button>
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>หมายเหตุ</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• YYYY = ปี ค.ศ. (เช่น 2024)</p>
          <p>• XXX = เลขรันเอกสาร 3 หลัก (เช่น 001, 002, 003)</p>
          <p>• ตัวอย่าง: QT-2024-001, INV-2024-156</p>
        </CardContent>
      </Card>
    </div>;
};
export default DocumentNumbering;