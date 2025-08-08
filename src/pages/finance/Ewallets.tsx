import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Smartphone, Plus, CreditCard, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { ewalletService, Ewallet } from "../../services/ewalletService";
import EwalletModal from "../sub/ewallet/EwalletModal";

const Ewallets = () => {
  const navigate = useNavigate();
  const [ewallets, setEwallets] = useState<Ewallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEwallet, setSelectedEwallet] = useState<Ewallet | null>(null);
  const [createForm, setCreateForm] = useState({
    wallet_name: "",
    wallet_type: "",
    account_number: "",
    current_balance: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadEwallets = async () => {
    try {
      setLoading(true);
      const response = await ewalletService.getEwallets();
      setEwallets(response);
    } catch (error) {
      console.error("Failed to load e-wallets:", error);
      toast.error("ไม่สามารถโหลดข้อมูล e-wallet ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEwallets();
  }, []);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
    }).format(balance);
  };

  const getWalletTypeColor = (type: string) => {
    switch (type) {
      case "Shopee":
        return "text-orange-600";
      case "Lazada":
        return "text-blue-600";
      case "Grab":
        return "text-green-600";
      case "Line":
        return "text-green-500";
      case "TrueMoney":
        return "text-blue-500";
      case "PromptPay":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
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

  const handleCreateEwallet = () => {
    setShowCreateModal(true);
  };

  const handleSubmitCreate = async () => {
    if (
      !createForm.wallet_name ||
      !createForm.wallet_type ||
      !createForm.account_number
    ) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setSubmitting(true);
      await ewalletService.createEwallet({
        wallet_name: createForm.wallet_name,
        wallet_type: createForm.wallet_type,
        account_number: createForm.account_number,
        current_balance: parseFloat(createForm.current_balance) || 0,
      });

      toast.success("สร้าง e-wallet สำเร็จ");
      setShowCreateModal(false);
      setCreateForm({
        wallet_name: "",
        wallet_type: "",
        account_number: "",
        current_balance: "",
      });
      loadEwallets(); // โหลดข้อมูลใหม่
    } catch (error: any) {
      console.error("Failed to create e-wallet:", error);
      if (error?.response?.status === 409) {
        toast.error("หมายเลขบัญชีนี้มีอยู่ในระบบแล้ว");
      } else {
        toast.error("ไม่สามารถสร้าง e-wallet ได้");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditEwallet = (ewallet: Ewallet) => {
    setSelectedEwallet(ewallet);
    setShowEditModal(true);
  };

  const handleDeleteEwallet = async (ewallet: Ewallet) => {
    if (confirm(`คุณต้องการลบ ${ewallet.wallet_name} หรือไม่?`)) {
      try {
        await ewalletService.deleteEwallet(ewallet.id);
        toast.success("ลบ e-wallet สำเร็จ");
        loadEwallets(); // โหลดข้อมูลใหม่
      } catch (error) {
        console.error("Failed to delete e-wallet:", error);
        toast.error("ไม่สามารถลบ e-wallet ได้");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">E-Wallet</h1>
            <p className="font-thin text-gray-400">
              จัดการ e-wallet และ digital wallet ทั้งหมด
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2"
            onClick={handleCreateEwallet}
          >
            <Plus className="w-4 h-4" />
            เพิ่ม E-Wallet
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 animate-spin rounded-full border-2 border-purple-600 border-t-transparent"></div>
            <span>กำลังโหลดข้อมูล...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ewallets.map((ewallet) => (
            <Card
              key={ewallet.id}
              className="border border-border/40 hover:shadow-lg transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CreditCard className="w-8 h-8 text-primary" />
                  <span
                    className={`text-sm font-medium ${getWalletTypeColor(ewallet.wallet_type)}`}
                  >
                    {ewallet.wallet_type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-foreground">
                      {ewallet.wallet_name}
                    </p>
                    <p className="text-sm text-purple-700">
                      {ewallet.account_number}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40">
                    <p className="text-sm text-muted-foreground">ยอดคงเหลือ</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatBalance(ewallet.current_balance)}
                    </p>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-400"
                      onClick={() =>
                        navigate(`/finance/ewallets/${ewallet.id}`)
                      }
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      ดูรายละเอียด
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white border-purple-500"
                      onClick={() => handleEditEwallet(ewallet)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      แก้ไข
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteEwallet(ewallet)}
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

      {!loading && ewallets.length === 0 && (
        <div className="text-center py-12">
          <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ไม่มี E-Wallet
          </h3>
          <p className="text-gray-500 mb-4">
            เริ่มต้นโดยการเพิ่ม e-wallet ใหม่
          </p>
          <Button
            className="flex items-center gap-2"
            onClick={handleCreateEwallet}
          >
            <Plus className="w-4 h-4" />
            เพิ่ม E-Wallet
          </Button>
        </div>
      )}

      {/* Create E-Wallet Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>เพิ่ม E-Wallet ใหม่</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="wallet_name">ชื่อ E-Wallet</Label>
              <Input
                id="wallet_name"
                placeholder="เช่น Shopee Wallet, Lazada Wallet"
                value={createForm.wallet_name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, wallet_name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="wallet_type">ประเภท E-Wallet</Label>
              <Select
                value={createForm.wallet_type}
                onValueChange={(value) =>
                  setCreateForm({ ...createForm, wallet_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="เลือกประเภท E-Wallet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Shopee">Shopee</SelectItem>
                  <SelectItem value="Lazada">Lazada</SelectItem>
                  <SelectItem value="Grab">Grab</SelectItem>
                  <SelectItem value="Line">Line</SelectItem>
                  <SelectItem value="TrueMoney">TrueMoney</SelectItem>
                  <SelectItem value="PromptPay">PromptPay</SelectItem>
                  <SelectItem value="อื่นๆ">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account_number">หมายเลขบัญชี/อีเมล</Label>
              <Input
                id="account_number"
                placeholder="เช่น 0812345678 หรือ example@email.com"
                value={createForm.account_number}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    account_number: e.target.value,
                  })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="current_balance">ยอดคงเหลือเริ่มต้น</Label>
              <Input
                id="current_balance"
                type="number"
                placeholder="0.00"
                value={createForm.current_balance}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    current_balance: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              ยกเลิก
            </Button>
            <Button
              onClick={handleSubmitCreate}
              disabled={submitting}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {submitting ? "กำลังสร้าง..." : "สร้าง E-Wallet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit E-Wallet Modal */}
      <EwalletModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedEwallet(null);
        }}
        ewallet={selectedEwallet}
        onSuccess={loadEwallets}
      />
    </div>
  );
};

export default Ewallets;
