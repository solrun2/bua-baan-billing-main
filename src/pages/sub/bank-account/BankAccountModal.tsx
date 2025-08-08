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
import { bankAccountService, BankAccount } from "@/services/bankAccountService";
import { toast } from "sonner";

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account?: BankAccount | null;
  onSuccess: () => void;
}

const BankAccountModal = ({
  isOpen,
  onClose,
  account,
  onSuccess,
}: BankAccountModalProps) => {
  const [formData, setFormData] = useState({
    bank_name: "",
    account_type: "ออมทรัพย์",
    account_number: "",
    current_balance: 0,
  });
  const [loading, setLoading] = useState(false);

  const isEditing = !!account;

  useEffect(() => {
    if (account) {
      setFormData({
        bank_name: account.bank_name,
        account_type: account.account_type,
        account_number: account.account_number,
        current_balance: account.current_balance,
      });
    } else {
      setFormData({
        bank_name: "",
        account_type: "ออมทรัพย์",
        account_number: "",
        current_balance: 0,
      });
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.bank_name || !formData.account_number) {
      toast.error("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      setLoading(true);

      if (isEditing && account) {
        await bankAccountService.updateBankAccount(account.id, formData);
        toast.success("อัปเดตบัญชีธนาคารสำเร็จ");
      } else {
        await bankAccountService.createBankAccount(formData);
        toast.success("สร้างบัญชีธนาคารสำเร็จ");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Failed to save bank account:", error);
      if (error?.response?.status === 409) {
        toast.error("เลขที่บัญชีนี้มีอยู่ในระบบแล้ว");
      } else {
        toast.error(
          isEditing
            ? "ไม่สามารถอัปเดตบัญชีธนาคารได้"
            : "ไม่สามารถสร้างบัญชีธนาคารได้"
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
            {isEditing ? "แก้ไขบัญชีธนาคาร" : "เพิ่มบัญชีธนาคาร"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank_name">ชื่อธนาคาร</Label>
            <Input
              id="bank_name"
              value={formData.bank_name}
              onChange={(e) => handleInputChange("bank_name", e.target.value)}
              placeholder="เช่น ธนาคารกรุงเทพ"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_type">ประเภทบัญชี</Label>
            <Select
              value={formData.account_type}
              onValueChange={(value) =>
                handleInputChange("account_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ออมทรัพย์">ออมทรัพย์</SelectItem>
                <SelectItem value="กระแสรายวัน">กระแสรายวัน</SelectItem>
                <SelectItem value="ประจำ">ประจำ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_number">เลขที่บัญชี</Label>
            <Input
              id="account_number"
              value={formData.account_number}
              onChange={(e) =>
                handleInputChange("account_number", e.target.value)
              }
              placeholder="เช่น 123-4-56789-0"
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

export default BankAccountModal;
