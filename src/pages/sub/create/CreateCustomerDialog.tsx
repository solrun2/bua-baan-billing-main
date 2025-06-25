import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiService } from "@/pages/services/apiService";
import { Customer } from "@/types/customer";

type CustomerCreateData = Omit<Customer, "id">;

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerCreated: (newCustomer: Customer) => void;
}

const CreateCustomerDialog: React.FC<CreateCustomerDialogProps> = ({
  open,
  onOpenChange,
  onCustomerCreated,
}) => {
  const [newCustomer, setNewCustomer] = useState<CustomerCreateData>({
    name: "",
    tax_id: "",
    address: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (
    field: keyof CustomerCreateData,
    value: string
  ) => {
    let processedValue = value;

    if (field === "tax_id") {
      // Allow only numbers and limit to 13 digits
      processedValue = value.replace(/[^\d]/g, "").slice(0, 13);
    }

    if (field === "phone") {
      // Allow only numbers and limit to a reasonable length, e.g., 15 digits
      processedValue = value.replace(/[^\d]/g, "").slice(0, 15);
    }

    setNewCustomer((prev) => ({ ...prev, [field]: processedValue }));
  };

  const handleSubmit = async () => {
    if (!newCustomer.name || !newCustomer.tax_id) {
      setError("กรุณากรอกชื่อและเลขประจำตัวผู้เสียภาษี");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      const { customer } = await apiService.createCustomer(newCustomer);
      onCustomerCreated(customer);
      onOpenChange(false);
      // Reset form
      setNewCustomer({
        name: "",
        tax_id: "",
        address: "",
        phone: "",
        email: "",
      });
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาดในการสร้างลูกค้า");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>สร้างลูกค้าใหม่</DialogTitle>
          <DialogDescription>
            กรอกข้อมูลลูกค้าใหม่ด้านล่างนี้
            เมื่อบันทึกแล้วลูกค้าจะถูกเลือกโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              ชื่อ *
            </Label>
            <Input
              id="name"
              value={newCustomer.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tax_id" className="text-right">
              เลขผู้เสียภาษี *
            </Label>
            <Input
              id="tax_id"
              value={newCustomer.tax_id}
              onChange={(e) => handleInputChange("tax_id", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              ที่อยู่
            </Label>
            <Textarea
              id="address"
              value={newCustomer.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              โทรศัพท์
            </Label>
            <Input
              id="phone"
              value={newCustomer.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              อีเมล
            </Label>
            <Input
              id="email"
              value={newCustomer.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="col-span-3"
            />
          </div>
          {error && (
            <p className="col-span-4 text-red-500 text-sm text-center">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            ยกเลิก
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCustomerDialog;
