import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PiggyBank,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Plus,
  Minus,
} from "lucide-react";
import {
  bankAccountService,
  CashFlowEntry,
  CashFlowSummary,
} from "@/services/bankAccountService";
import { toast } from "sonner";

const Cashflow = () => {
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [summary, setSummary] = useState<CashFlowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const loadCashFlow = async () => {
    try {
      setLoading(true);
      const [entries, summaryData] = await Promise.all([
        bankAccountService.getCashFlow({
          month: currentMonth,
          year: currentYear,
        }),
        bankAccountService.getCashFlowSummary(currentYear),
      ]);
      setCashFlowEntries(entries);
      setSummary(summaryData);
    } catch (error) {
      console.error("Failed to load cash flow:", error);
      toast.error("ไม่สามารถโหลดข้อมูลกระแสเงินสดได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCashFlow();
  }, [currentMonth, currentYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getMonthName = (month: number) => {
    const months = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    return months[month - 1];
  };

  const currentMonthData = summary.find((s) => s.month === currentMonth) || {
    total_income: 0,
    total_expense: 0,
    net_flow: 0,
  };

  const getTypeIcon = (type: string) => {
    return type === "income" ? (
      <Plus className="w-4 h-4 text-green-600" />
    ) : (
      <Minus className="w-4 h-4 text-red-600" />
    );
  };

  const getTypeColor = (type: string) => {
    return type === "income" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
            <PiggyBank className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">กระแสเงินสด</h1>
            <p className="text-gray-400">ติดตามกระแสเงินสดรายเดือน</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadCashFlow}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรช
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-950">
              รายรับเดือนนี้
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(currentMonthData.total_income)}
            </div>
            <p className="text-xs text-green-600 mt-1">
              {currentMonthData.total_income > 0 ? "มีรายรับ" : "ไม่มีรายรับ"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              รายจ่ายเดือนนี้
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(currentMonthData.total_expense)}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {currentMonthData.total_expense > 0
                ? "มีรายจ่าย"
                : "ไม่มีรายจ่าย"}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-900">
              กระแสเงินสุทธิ
            </CardTitle>
            <DollarSign className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${currentMonthData.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(currentMonthData.net_flow)}
            </div>
            <p
              className={`text-xs mt-1 ${currentMonthData.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {currentMonthData.net_flow >= 0 ? "กำไร" : "ขาดทุน"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>
            รายการกระแสเงินสดเดือน {getMonthName(currentMonth)} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : cashFlowEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      วันที่
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      ประเภท
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      รายละเอียด
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      บัญชีธนาคาร
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      จำนวนเงิน
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cashFlowEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(entry.type)}
                          <span
                            className={`font-medium ${getTypeColor(entry.type)}`}
                          >
                            {entry.type === "income" ? "รายรับ" : "รายจ่าย"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {entry.description}
                      </td>
                      <td className="py-3 px-4 text-foreground">
                        {entry.bank_name
                          ? `${entry.bank_name} - ${entry.account_number}`
                          : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 font-bold ${getTypeColor(entry.type)}`}
                      >
                        {formatCurrency(entry.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <PiggyBank className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                ไม่มีรายการกระแสเงินสด
              </h3>
              <p className="text-gray-500">
                ยังไม่มีรายการในเดือน {getMonthName(currentMonth)} {currentYear}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-border/40">
        <CardHeader>
          <CardTitle>สรุปกระแสเงินสดรายเดือน {currentYear}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span>กำลังโหลดข้อมูล...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      เดือน
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      รายรับ
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      รายจ่าย
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                      สุทธิ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((data) => (
                    <tr
                      key={data.month}
                      className="border-b border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-foreground">
                        {getMonthName(data.month)} {data.year}
                      </td>
                      <td className="py-3 px-4 text-green-600 font-medium">
                        {formatCurrency(data.total_income)}
                      </td>
                      <td className="py-3 px-4 text-red-600 font-medium">
                        {formatCurrency(data.total_expense)}
                      </td>
                      <td
                        className={`py-3 px-4 font-bold ${data.net_flow >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(data.net_flow)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Cashflow;
