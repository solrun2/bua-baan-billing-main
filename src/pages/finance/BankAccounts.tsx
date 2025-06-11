import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Plus, CreditCard } from "lucide-react";
const BankAccounts = () => {
  const accounts = [{
    bank: "ธนาคารกสิกรไทย",
    accountNumber: "xxx-x-x5678-x",
    balance: "฿245,680",
    type: "ออมทรัพย์"
  }, {
    bank: "ธนาคารไทยพาณิชย์",
    accountNumber: "xxx-x-x1234-x",
    balance: "฿89,420",
    type: "กระแสรายวัน"
  }, {
    bank: "ธนาคารกรุงเทพ",
    accountNumber: "xxx-x-x9876-x",
    balance: "฿156,260",
    type: "ออมทรัพย์"
  }];
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">บัญชีธนาคาร</h1>
            <p className="font-thin text-gray-400">จัดการบัญชีธนาคารทั้งหมด</p>
          </div>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          เพิ่มบัญชีธนาคาร
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((account, index) => <Card key={index} className="border border-border/40 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CreditCard className="w-8 h-8 text-primary" />
                <span className="text-sm text-zinc-900">{account.type}</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground">{account.bank}</p>
                  <p className="text-sm text-yellow-700">{account.accountNumber}</p>
                </div>
                <div className="pt-2 border-t border-border/40">
                  <p className="text-sm text-muted-foreground">ยอดคงเหลือ</p>
                  <p className="text-2xl font-bold text-foreground">{account.balance}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 border-gray-400">ดู</Button>
                  <Button variant="outline" size="sm" className="flex-1 border-gray-400">แก้ไข</Button>
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>
    </div>;
};
export default BankAccounts;