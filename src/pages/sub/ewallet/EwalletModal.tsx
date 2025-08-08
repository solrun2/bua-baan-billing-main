import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ewalletService, Ewallet } from "@/services/ewalletService";
import { toast } from "sonner";

interface EwalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  ewallet?: Ewallet | null;
  onSuccess: () => void;
}

const EwalletModal = ({
  isOpen,
  onClose,
  ewallet,
  onSuccess,
}: EwalletModalProps) => {
  const [formData, setFormData] = useState({
    wallet_name: "",
    wallet_type: "Shopee",
    account_number: "",
    current_balance: 0,
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!ewallet;

  useEffect(() => {
    if (ewallet) {
      setFormData({
        wallet_name: ewallet.wallet_name,
        wallet_type: ewallet.wallet_type,
        account_number: ewallet.account_number,
        current_balance: ewallet.current_balance,
      });
    } else {
      setFormData({
        wallet_name: "",
        wallet_type: "Shopee",
        account_number: "",
        current_balance: 0,
      });
    }
  }, [ewallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.wallet_name || !formData.account_number) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setLoading(true);

      if (isEditing && ewallet) {
        await ewalletService.updateEwallet(ewallet.id, {
          ...formData,
          is_active: true, // ตั้งค่า is_active เป็น 1 เมื่ออัปเดต
        });
        toast.success("อัปเดต E-Wallet สำเร็จ");
      } else {
        await ewalletService.createEwallet(formData);
        toast.success("สร้าง E-Wallet สำเร็จ");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save e-wallet:", error);
      if (error?.response?.status === 409) {
        toast.error("หมายเลขบัญชีนี้มีอยู่ในระบบแล้ว");
      } else {
        toast.error(
          isEditing
            ? "ไม่สามารถอัปเดต E-Wallet ได้"
            : "ไม่สามารถสร้าง E-Wallet ได้"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "แก้ไข E-Wallet" : "เพิ่ม E-Wallet"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wallet_name">ชื่อ E-Wallet</Label>
            <Input
              id="wallet_name"
              value={formData.wallet_name}
              onChange={(e) => handleInputChange("wallet_name", e.target.value)}
              placeholder="เช่น Shopee Wallet, Lazada Wallet"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wallet_type">ประเภท E-Wallet</Label>
            <Select
              value={formData.wallet_type}
              onValueChange={(value) => handleInputChange("wallet_type", value)}
            >
              <SelectTrigger>
                <SelectValue />
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

          <div className="space-y-2">
            <Label htmlFor="account_number">หมายเลขบัญชี/อีเมล</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) =>
                handleInputChange("account_number", e.target.value)
              }
              placeholder="เช่น 0812345678 หรือ example@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_balance">ยอดคงเหลือเริ่มต้น</Label>
            <Input
              id="current_balance"
              type="number"
              value={formData.current_balance}
              onChange={(e) =>
                handleInputChange(
                  "current_balance",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "กำลังบันทึก..." : isEditing ? "อัปเดต" : "สร้าง"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EwalletModal;
