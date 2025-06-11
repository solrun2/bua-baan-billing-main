import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
const Cashflow = () => {
  const monthlyData = [{
    month: "มกราคม 2024",
    income: "฿245,680",
    expense: "฿189,420",
    net: "฿56,260"
  }, {
    month: "กุมภาพันธ์ 2024",
    income: "฿298,450",
    expense: "฿201,350",
    net: "฿97,100"
  }, {
    month: "มีนาคม 2024",
    income: "฿189,320",
    expense: "฿156,780",
    net: "฿32,540"
  }];
  return <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
          <PiggyBank className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">กระแสเงินสด</h1>
          <p className="text-gray-400">ติดตามกระแสเงินสดรายเดือน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">รายรับเดือนนี้</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">฿245,680</div>
            <p className="text-xs text-green-600 mt-1">+12.5% จากเดือนที่แล้ว</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">รายจ่ายเดือนนี้</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">฿189,420</div>
            <p className="text-xs text-red-600 mt-1">-8.2% จากเดือนที่แล้ว</p>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">กระแสเงินสุทธิ</CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">฿56,260</div>
            <p className="text-xs text-blue-600 mt-1">+18.7% จากเดือนที่แล้ว</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>กระแสเงินสดรายเดือน</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">เดือน</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">รายรับ</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">รายจ่าย</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">สุทธิ</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((data, index) => <tr key={index} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-foreground">{data.month}</td>
                    <td className="py-3 px-4 text-green-600 font-medium">{data.income}</td>
                    <td className="py-3 px-4 text-red-600 font-medium">{data.expense}</td>
                    <td className="py-3 px-4 text-blue-600 font-bold">{data.net}</td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>;
};
export default Cashflow;