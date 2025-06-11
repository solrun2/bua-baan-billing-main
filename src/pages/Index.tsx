import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, CreditCard, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const Index = () => {
  const stats = [
    {
      title: "รายได้เดือนนี้",
      value: "฿245,680",
      change: "+12.5%",
      trend: "up",
      icon: TrendingUp,
      color: "text-blue-600"
    },
    {
      title: "ค่าใช้จ่ายเดือนนี้",
      value: "฿89,420",
      change: "-8.2%",
      trend: "down",
      icon: TrendingDown,
      color: "text-red-600"
    },
    {
      title: "กำไรสุทธิ",
      value: "฿156,260",
      change: "+18.7%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-800"
    },
    {
      title: "เอกสารรอดำเนินการ",
      value: "23",
      change: "+5",
      trend: "up",
      icon: FileText,
      color: "text-gray-800"
    }
  ];

  const recentDocuments = [
    { id: "QT-2024-001", type: "ใบเสนอราคา", client: "บริษัท ABC จำกัด", amount: "฿50,000", status: "รอการอนุมัติ" },
    { id: "INV-2024-156", type: "ใบแจ้งหนี้", client: "บริษัท XYZ จำกัด", amount: "฿75,000", status: "ส่งแล้ว" },
    { id: "RC-2024-089", type: "ใบเสร็จ", client: "บริษัท DEF จำกัด", amount: "฿30,000", status: "ชำระแล้ว" },
    { id: "TI-2024-067", type: "ใบกำกับภาษี", client: "บริษัท GHI จำกัด", amount: "฿120,000", status: "ออกแล้ว" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8 border border-border/40">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-black">ภาพรวมระบบบัญชีและการเงิน</p>
          </div>
        </div>
        <div className="text-sm text-foreground">
          อัปเดตล่าสุด: {new Date().toLocaleDateString('th-TH', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="border-0 shadow-sm hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className={`text-sm font-medium ${
                stat.title === "รายได้เดือนนี้" ? "text-blue-600" :
                stat.title === "ค่าใช้จ่ายเดือนนี้" ? "text-red-600" :
                stat.title === "กำไรสุทธิ" ? "text-green-800" :
                "text-gray-800"
              }`}>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                stat.title === "รายได้เดือนนี้" ? "text-blue-600" :
                stat.title === "ค่าใช้จ่ายเดือนนี้" ? "text-red-600" :
                stat.title === "กำไรสุทธิ" ? "text-green-800" :
                "text-gray-800"
              }`}>{stat.value}</div>
              <p className={`text-xs flex items-center gap-1 mt-1 ${
                stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{stat.change}</span>
                <span className="text-foreground">จากเดือนที่แล้ว</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              เอกสารล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/30 transition-colors">
                  <div>
                    <div className="font-medium text-foreground">{doc.id}</div>
                    <div className="text-sm text-foreground">{doc.type} - {doc.client}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">{doc.amount}</div>
                    <div className="text-xs text-foreground">{doc.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              กระแสเงินสด 7 วันที่ผ่านมา
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { date: "วันนี้", income: "฿15,000", expense: "฿8,500", net: "฿6,500" },
                { date: "เมื่อวาน", income: "฿22,000", expense: "฿12,000", net: "฿10,000" },
                { date: "2 วันที่แล้ว", income: "฿18,500", expense: "฿9,200", net: "฿9,300" },
                { date: "3 วันที่แล้ว", income: "฿25,000", expense: "฿15,800", net: "฿9,200" },
              ].map((item, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 p-3 rounded-lg border border-border/40 text-sm">
                  <div className="font-medium text-foreground">{item.date}</div>
                  <div className="text-green-600">{item.income}</div>
                  <div className="text-red-600">{item.expense}</div>
                  <div className="text-blue-600 font-medium">{item.net}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
