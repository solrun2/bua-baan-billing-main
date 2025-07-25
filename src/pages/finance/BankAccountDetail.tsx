import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, TrendingUp, TrendingDown } from "lucide-react";
import {
  bankAccountService,
  BankAccount,
  CashFlowEntry,
} from "@/services/bankAccountService";
import { toast } from "sonner";

const BankAccountDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [cashFlowEntries, setCashFlowEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAccountDetail();
    }
  }, [id]);

  const loadAccountDetail = async () => {
    try {
      setLoading(true);
      const accountData = await bankAccountService.getBankAccount(
        parseInt(id!)
      );
      setAccount(accountData);

      // ดึงรายการ cash flow ของบัญชีนี้
      const cashFlowData = await bankAccountService.getCashFlowByAccount(
        parseInt(id!)
      );
      setCashFlowEntries(cashFlowData);
    } catch (error) {
      console.error("Failed to load account detail:", error);
      toast.error("ไม่สามารถโหลดข้อมูลบัญชีธนาคารได้");
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

  const getAccountTypeColor = (type: string) => {
    switch (type) {
      case "ออมทรัพย์":
        return "text-green-600";
      case "กระแสรายวัน":
        return "text-blue-600";
      case "ประจำ":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
          <span>กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-500">ไม่พบข้อมูลบัญชีธนาคาร</p>
          <Button
            onClick={() => navigate("/finance/bank-accounts")}
            className="mt-4"
          >
            กลับไปหน้าบัญชีธนาคาร
          </Button>
        </div>
      </div>
    );
  }

  const totalIncome = cashFlowEntries
    .filter((entry) => entry.type === "income")
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const totalExpense = cashFlowEntries
    .filter((entry) => entry.type === "expense")
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/finance/bank-accounts")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับ
        </Button>
        <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {account.bank_name}
          </h1>
          <p className="font-thin text-gray-400">รายละเอียดบัญชีธนาคาร</p>
        </div>
      </div>

      {/* Account Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ข้อมูลบัญชี</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">ประเภทบัญชี</p>
              <p
                className={`font-medium ${getAccountTypeColor(account.account_type)}`}
              >
                {account.account_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">เลขที่บัญชี</p>
              <p className="font-medium text-yellow-700">
                {account.account_number}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">สกุลเงิน</p>
              <p className="font-medium">{account.currency}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">ยอดคงเหลือ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">
              {formatBalance(account.current_balance)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">สรุปการเคลื่อนไหว</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">รายรับ</span>
              <span className="font-medium text-green-600">
                {formatBalance(totalIncome)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-600" />
              <span className="text-sm text-muted-foreground">รายจ่าย</span>
              <span className="font-medium text-red-600">
                {formatBalance(totalExpense)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow History */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการเคลื่อนไหวเงิน</CardTitle>
        </CardHeader>
        <CardContent>
          {cashFlowEntries.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">ไม่มีประวัติการเคลื่อนไหวเงิน</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cashFlowEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border border-border/40 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          entry.type === "income"
                            ? "bg-green-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(entry.date)}
                        </p>
                        {entry.category && (
                          <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full inline-block mt-1">
                            {entry.category}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${
                        entry.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {entry.type === "income" ? "+" : "-"}
                      {formatBalance(entry.amount)}
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

export default BankAccountDetail;
