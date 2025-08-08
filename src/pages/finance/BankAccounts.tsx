import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Plus, CreditCard, Edit, Trash2, Eye } from "lucide-react";
import { bankAccountService, BankAccount } from "@/services/bankAccountService";
import { toast } from "sonner";
import BankAccountModal from "@/pages/sub/bank-account/BankAccountModal";
import DeleteBankAccountDialog from "@/pages/sub/bank-account/DeleteBankAccountDialog";

const BankAccounts = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(
    null
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<BankAccount | null>(
    null
  );

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const accounts = await bankAccountService.getBankAccounts();
      setAccounts(accounts);
    } catch (error) {
      console.error("Failed to load bank accounts:", error);
      toast.error("ไม่สามารถโหลดข้อมูลบัญชีธนาคารได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(balance);
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

  const getBankIcon = (bankName: string) => {
    // ใช้ emoji หรือ icon ตามชื่อธนาคาร
    if (bankName.includes("กรุงเทพ")) return "🏦";
    if (bankName.includes("กสิกร")) return "🏛️";
    if (bankName.includes("ไทยพาณิชย์")) return "🏢";
    if (bankName.includes("กรุงไทย")) return "🏦";
    if (bankName.includes("ทหารไทย")) return "🎖️";
    if (bankName.includes("กรุงศรี")) return "🏛️";
    if (bankName.includes("กรุงนคร")) return "🏦";
    if (bankName.includes("ยูโอบี")) return "🏦";
    if (bankName.includes("ซิตี้แบงก์")) return "🏦";
    return "🏦";
  };

  const handleCreateAccount = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDeleteAccount = (account: BankAccount) => {
    setDeletingAccount(account);
    setIsDeleteDialogOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
  };

  const handleDeleteDialogClose = () => {
    setIsDeleteDialogOpen(false);
    setDeletingAccount(null);
  };

  return (
    <div className="space-y-6">
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
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2"
            onClick={handleCreateAccount}
          >
            <Plus className="w-4 h-4" />
            เพิ่มบัญชีธนาคาร
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"></div>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className="border border-border/40 hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <span
                    className={`text-sm font-medium ${getAccountTypeColor(account.account_type)}`}
                  >
                    {account.account_type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {account.bank_name}
                    </p>
                    <p className="text-sm text-yellow-700">
                      {account.account_number}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm text-muted-foreground">ยอดคงเหลือ</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatBalance(account.current_balance)}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-400"
                      onClick={() =>
                        navigate(`/finance/bank-accounts/${account.id}`)
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      ดูรายละเอียด
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                      onClick={() => handleEditAccount(account)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      แก้ไข
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteAccount(account)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ไม่มีบัญชีธนาคาร
          </h3>
          <p className="text-gray-500 mb-4">
            เริ่มต้นโดยการเพิ่มบัญชีธนาคารใหม่
          </p>
          <Button
            className="flex items-center gap-2"
            onClick={handleCreateAccount}
          >
            <Plus className="w-4 h-4" />
            เพิ่มบัญชีธนาคาร
          </Button>
        </div>
      )}

      {/* Modal สำหรับสร้างและแก้ไขบัญชีธนาคาร */}
      <BankAccountModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        account={editingAccount}
        onSuccess={loadBankAccounts}
      />

      {/* Dialog สำหรับยืนยันการลบบัญชีธนาคาร */}
      <DeleteBankAccountDialog
        isOpen={isDeleteDialogOpen}
        onClose={handleDeleteDialogClose}
        accountId={deletingAccount?.id || 0}
        accountName={deletingAccount?.bank_name || ""}
        onSuccess={loadBankAccounts}
      />
    </div>
  );
};

export default BankAccounts;
