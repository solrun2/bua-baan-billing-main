import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Smartphone,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import {
  ewalletService,
  Ewallet,
  CashFlowEntry,
} from "../../services/ewalletService";

const EwalletDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ewallet, setEwallet] = useState<Ewallet | null>(null);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [monthlyExpense, setMonthlyExpense] = useState(0);

  useEffect(() => {
    if (id) {
      loadEwalletDetail();
    }
  }, [id]);

  const loadEwalletDetail = async () => {
    try {
      setLoading(true);
      const ewalletData = await ewalletService.getEwallet(parseInt(id!));
      setEwallet(ewalletData);

      // ดึงข้อมูล cash flow
      const cashFlowData = await ewalletService.getCashFlowByEwallet(
        parseInt(id!)
      );
      setCashFlowEntries(cashFlowData);

      // คำนวณรายได้/รายจ่ายเดือนนี้
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const monthlyData = cashFlowData.filter((entry) => {
        const entryDate = new Date(entry.date);
        return (
          entryDate.getMonth() === currentMonth &&
          entryDate.getFullYear() === currentYear
        );
      });

      const income = monthlyData
        .filter((entry) => entry.type === "income")
        .reduce((sum, entry) => sum + entry.amount, 0);

      const expense = monthlyData
        .filter((entry) => entry.type === "expense")
        .reduce((sum, entry) => sum + entry.amount, 0);

      setMonthlyIncome(income);
      setMonthlyExpense(expense);
    } catch (error) {
      console.error("Failed to load ewallet detail:", error);
      toast.error("ไม่สามารถโหลดข้อมูล e-wallet ได้");
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(balance);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case "Shopee":
        return "🛍️";
      case "Lazada":
        return "📦";
      case "Grab":
        return "🚗";
      case "Line":
        return "💬";
      case "TrueMoney":
        return "💳";
      case "PromptPay":
        return "📱";
      default:
        return "💳";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (!ewallet) {
    return (
      <div className="text-center py-12">
        <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          ไม่พบข้อมูล E-Wallet
        </h3>
        <Button onClick={() => navigate("/finance/ewallets")}>
          กลับไปหน้า E-Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/finance/ewallets")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <span className="text-2xl">
              {getWalletIcon(ewallet.wallet_type)}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {ewallet.wallet_name}
            </h1>
            <p className="font-thin text-gray-400">
              {ewallet.wallet_type} • {ewallet.account_number}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              ยอดคงเหลือปัจจุบัน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-900">
              {formatBalance(ewallet.current_balance)}
            </div>
            <p className="text-sm text-blue-600 mt-1">
              อัปเดตล่าสุด: {formatDate(ewallet.updated_at)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              รายได้เดือนนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-green-900">
                {formatBalance(monthlyIncome)}
              </span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              รายการ:{" "}
              {
                cashFlowEntries.filter((entry) => entry.type === "income")
                  .length
              }{" "}
              รายการ
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              รายจ่ายเดือนนี้
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-red-900">
                {formatBalance(monthlyExpense)}
              </span>
            </div>
            <p className="text-sm text-red-600 mt-1">
              รายการ:{" "}
              {
                cashFlowEntries.filter((entry) => entry.type === "expense")
                  .length
              }{" "}
              รายการ
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            ประวัติรายการ
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlowEntries.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">ยังไม่มีรายการธุรกรรม</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cashFlowEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        entry.type === "income"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {entry.type === "income" ? (
                        <TrendingUp className="w-6 h-6" />
                      ) : (
                        <TrendingDown className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDate(entry.date)}</span>
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(entry.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-xl font-bold ${
                        entry.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.type === "income" ? "+" : "-"}
                      {formatBalance(entry.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ยอดคงเหลือ: {formatBalance(entry.balance_after)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EwalletDetail;
