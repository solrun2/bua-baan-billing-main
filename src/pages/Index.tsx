import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
} from "lucide-react";
import { apiService } from "./services/apiService";
import { formatCurrency } from "../lib/utils";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const stats = [
    {
      title: "รายได้เดือนนี้",
      value: "฿245,680",
      change: "+12.5%",
      trend: "up",
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      title: "ค่าใช้จ่ายเดือนนี้",
      value: "฿89,420",
      change: "-8.2%",
      trend: "down",
      icon: TrendingDown,
      color: "text-red-600",
    },
    {
      title: "กำไรสุทธิ",
      value: "฿156,260",
      change: "+18.7%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-800",
    },
    {
      title: "เอกสารรอดำเนินการ",
      value: "23",
      change: "+5",
      trend: "up",
      icon: FileText,
      color: "text-gray-800",
    },
  ];

  const [recentDocuments, setRecentDocuments] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        const docs = await apiService.getDocuments();
        // เรียงตามวันที่สร้างใหม่ล่าสุด (issue_date หรือ updated_at ถ้ามี)
        const sorted = docs
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateB - dateA;
          })
          .slice(0, 4);
        setRecentDocuments(sorted);
      } catch (e) {
        setRecentDocuments([]);
      }
    };
    fetchRecentDocuments();
  }, []);

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
          อัปเดตล่าสุด:{" "}
          {new Date().toLocaleDateString("th-TH", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-sm hover:shadow-lg transition-shadow"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle
                className={`text-sm font-medium ${
                  stat.title === "รายได้เดือนนี้"
                    ? "text-blue-600"
                    : stat.title === "ค่าใช้จ่ายเดือนนี้"
                      ? "text-red-600"
                      : stat.title === "กำไรสุทธิ"
                        ? "text-green-800"
                        : "text-gray-800"
                }`}
              >
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stat.title === "รายได้เดือนนี้"
                    ? "text-blue-600"
                    : stat.title === "ค่าใช้จ่ายเดือนนี้"
                      ? "text-red-600"
                      : stat.title === "กำไรสุทธิ"
                        ? "text-green-800"
                        : "text-gray-800"
                }`}
              >
                {stat.value}
              </div>
              <p
                className={`text-xs flex items-center gap-1 mt-1 ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                <span>{stat.change}</span>
                <span className="text-foreground">จากเดือนที่แล้ว</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border border-border/40 shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
              <FileText className="w-5 h-5 text-blue-400" />
              เอกสารล่าสุด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentDocuments.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  ไม่พบเอกสารล่าสุด
                </div>
              ) : (
                recentDocuments.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-white hover:bg-blue-100 transition-colors cursor-pointer"
                    onClick={() => {
                      const type = (
                        doc.document_type ||
                        doc.documentType ||
                        ""
                      ).toLowerCase();
                      if (type && doc.id) {
                        navigate(`/documents/${type}/edit/${doc.id}`);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-300" />
                      <div>
                        <div className="font-medium text-foreground text-sm">
                          {doc.document_number || doc.id}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {doc.document_type ? doc.document_type : doc.type} -{" "}
                          {doc.customer_name ||
                            (doc.customer && doc.customer.name) ||
                            "-"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-blue-700 text-base">
                        {doc.total_amount !== undefined
                          ? formatCurrency(Number(doc.total_amount))
                          : doc.amount !== undefined
                            ? formatCurrency(Number(doc.amount))
                            : "-"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {doc.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
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
                {
                  date: "วันนี้",
                  income: "฿15,000",
                  expense: "฿8,500",
                  net: "฿6,500",
                },
                {
                  date: "เมื่อวาน",
                  income: "฿22,000",
                  expense: "฿12,000",
                  net: "฿10,000",
                },
                {
                  date: "2 วันที่แล้ว",
                  income: "฿18,500",
                  expense: "฿9,200",
                  net: "฿9,300",
                },
                {
                  date: "3 วันที่แล้ว",
                  income: "฿25,000",
                  expense: "฿15,800",
                  net: "฿9,200",
                },
              ].map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-4 gap-2 p-3 rounded-lg border border-border/40 text-sm"
                >
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
