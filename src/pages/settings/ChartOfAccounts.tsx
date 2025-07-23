import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Plus, Trash2 } from "lucide-react";

const ChartOfAccounts = () => {
  const accounts = [
    {
      code: "1000",
      name: "เงินสด",
      type: "สินทรัพย์",
      balance: "฿125,000",
    },
    {
      code: "1100",
      name: "ลูกหนี้การค้า",
      type: "สินทรัพย์",
      balance: "฿85,500",
    },
    {
      code: "2000",
      name: "เจ้าหนี้การค้า",
      type: "หนี้สิน",
      balance: "฿45,000",
    },
    {
      code: "3000",
      name: "ทุนจดทะเบียน",
      type: "ส่วนของเจ้าของ",
      balance: "฿500,000",
    },
    {
      code: "4000",
      name: "รายได้จากการขาย",
      type: "รายได้",
      balance: "฿245,680",
    },
    {
      code: "5000",
      name: "ค่าใช้จ่ายในการขาย",
      type: "ค่าใช้จ่าย",
      balance: "฿89,420",
    },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black">ผังบัญชี</h1>
            <p className="text-gray-400">จัดการผังบัญชีและรหัสบัญชี</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          เพิ่มบัญชีใหม่
        </Button>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>รายการบัญชี</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-bold text-black">
                    รหัสบัญชี
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-black">
                    ชื่อบัญชี
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-black">
                    ประเภท
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-black">
                    ยอดคงเหลือ
                  </th>
                  <th className="text-left py-3 px-4 font-bold text-black">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr
                    key={index}
                    className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-foreground">
                      {account.code}
                    </td>
                    <td className="py-3 px-4 text-foreground">
                      {account.name}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{account.type}</td>
                    <td className="py-3 px-4 font-medium text-foreground">
                      {account.balance}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          แก้ไข
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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
export default ChartOfAccounts;
