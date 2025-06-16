// pages/CreateReceipt.tsx
import React, { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search } from "lucide-react";
import debounce from "lodash/debounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface Item {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  vat: number;
  withholdingTax: string;
  description: string;
}

function CreateReceipt() {
  const [reference, setReference] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [customer, setCustomer] = useState("Tester Tomato");
  const [useLatestContact, setUseLatestContact] = useState(false);
  const [address, setAddress] = useState(
    "22, แขวงสามเสนนอก, เขตห้วยขวาง, กรุงเทพมหานคร, 10310"
  );
  const [phone, setPhone] = useState("0813036966");
  const [priceType, setPriceType] = useState("exclude_tax");
  const [isTaxInvoice, setIsTaxInvoice] = useState(true);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [amountReceived, setAmountReceived] = useState(0);
  const [customerNotes, setCustomerNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    {
      id: "1",
      name: "",
      quantity: 1,
      price: 0,
      discount: 0,
      vat: 7,
      withholdingTax: "not_specified",
      description: "",
    },
  ]);

  const [showAdvancedPayment, setShowAdvancedPayment] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState("");
  const [paymentChannel, setPaymentChannel] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [showAdjustments, setShowAdjustments] = useState(false);
  const [adjustmentItems, setAdjustmentItems] = useState([
    {
      id: 1,
      type: "deduct",
      account: "",
      amount: 0,
      note: "",
    },
  ]);

  const accountOptions = [
    { value: "530501", label: "530501 - ค่าธรรมเนียมธนาคาร" },
    { value: "530502", label: "530502 - ค่าธรรมเนียมโอนเงิน" },
    { value: "530599", label: "530599 - ค่าธรรมเนียมอื่นๆ" },
  ];

  const [documentType, setDocumentType] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const debouncedSearch = useCallback(
    debounce(async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(
          `https://openapi.ketshoptest.com/customer/overview/${query}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults([data]);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleItemChange = (index: number, key: keyof Item, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    setItems(newItems);
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        id: (items.length + 1).toString(),
        name: "",
        quantity: 1,
        price: 0,
        discount: 0,
        vat: 7,
        withholdingTax: "not_specified",
        description: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.quantity * item.price - item.discount;
    if (priceType === "include_tax" && item.vat > 0) {
      const vatRate = item.vat / 100;
      const preTaxAmount = itemTotal / (1 + vatRate);
      return sum + preTaxAmount;
    }
    return sum + itemTotal;
  }, 0);

  const vatAmount = isTaxInvoice
    ? items.reduce((sum, item) => {
        if (priceType === "exclude_tax" && item.vat > 0) {
          const itemTotal = item.quantity * item.price - item.discount;
          return sum + itemTotal * (item.vat / 100);
        }
        return sum;
      }, 0)
    : 0;

  const grandTotal =
    priceType === "include_tax"
      ? items.reduce(
          (sum, item) => sum + (item.quantity * item.price - item.discount),
          0
        )
      : subtotal + vatAmount;
  const remaining = Math.max(0, grandTotal - amountReceived);

  const handleAdjustmentChange = (id: number, field: string, value: any) => {
    setAdjustmentItems((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const addAdjustmentItem = () => {
    setAdjustmentItems((prevItems) => [
      ...prevItems,
      {
        id: Date.now(),
        type: "deduct",
        account: "",
        amount: 0,
        note: "",
      },
    ]);
  };

  const removeAdjustmentItem = (id: number) => {
    if (adjustmentItems.length > 1) {
      setAdjustmentItems((prevItems) =>
        prevItems.filter((item) => item.id !== id)
      );
    }
  };

  const totalAdjustments = adjustmentItems.reduce((sum, item) => {
    const amount = item.amount || 0;
    return item.type === "deduct" ? sum - amount : sum + amount;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          สร้างใบเสร็จรับเงิน{isTaxInvoice ? "/ใบกำกับภาษี" : ""}
        </h1>
      </div>

      {/* Reference Section */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">ระบุเอกสารอ้างอิง (ถ้ามี)</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>อ้างอิง</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="ระบุอ้างอิง"
            />
          </div>
          <div>
            <Label>เลขที่เอกสาร</Label>
            <Input
              value={documentNumber}
              onChange={(e) => setDocumentNumber(e.target.value)}
              placeholder="ระบุเลขที่เอกสาร"
            />
          </div>
        </div>
      </section>

      {/* Customer Information */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">ข้อมูลลูกค้า</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ลูกค้า</Label>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="customer-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const query = e.target.value;
                    setSearchQuery(query);
                    debouncedSearch(query);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
                  placeholder="ค้นหาลูกค้า (รหัสหรือชื่อลูกค้า)"
                  className="pl-8"
                />
                {isSearching && (
                  <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />
                )}
              </div>
              {isDropdownOpen && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border max-h-60 overflow-auto">
                  {searchResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onMouseDown={() => {
                        setSelectedCustomer(customer);
                        setSearchQuery(customer.name);
                        setIsDropdownOpen(false);
                        setCustomer(customer.name);
                        if (customer.address) setAddress(customer.address);
                        if (customer.phone) setPhone(customer.phone);
                      }}
                    >
                      <div className="font-medium">{customer.name}</div>
                      {customer.phone && (
                        <div className="text-sm text-gray-500">
                          {customer.phone}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <Checkbox
                id="use-latest-contact"
                checked={useLatestContact}
                onCheckedChange={(checked) => {
                  if (checked === "indeterminate") {
                    setUseLatestContact(false);
                  } else {
                    setUseLatestContact(checked);
                  }
                }}
              />
              <Label htmlFor="use-latest-contact" className="text-sm">
                ใช้รายการล่าสุดของผู้ติดต่อนี้
              </Label>
            </div>
          </div>
          <div>
            <Label>วันที่ออก</Label>
            <Input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label>ที่อยู่</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>เบอร์โทร</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
      </section>

      {/* Price and Tax */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">ข้อมูลราคาและภาษี</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>ประเภทราคา</Label>
            <Select value={priceType} onValueChange={setPriceType}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภทราคา" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exclude_tax">แยกภาษี</SelectItem>
                <SelectItem value="include_tax">รวมภาษี</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center space-x-2">
              <Switch
                id="tax-invoice"
                checked={isTaxInvoice}
                onCheckedChange={setIsTaxInvoice}
              />
              <Label htmlFor="tax-invoice">ออกใบกำกับภาษี</Label>
            </div>
          </div>
        </div>
      </section>

      {/* Items Table */}
      <section className="border rounded p-4 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2 w-12">#</th>
                <th className="p-2 min-w-[300px]">สินค้า/บริการ</th>
                <th className="p-2 w-24 text-right">จำนวน</th>
                <th className="p-2 w-32 text-right">ราคา/หน่วย</th>
                <th className="p-2 w-32 text-right">ส่วนลด/หน่วย</th>
                <th className="p-2 w-24 text-right">ภาษี</th>
                <th className="p-2 w-32 text-right">มูลค่าก่อนภาษี</th>
                <th className="p-2 w-32 text-right">หัก ณ ที่จ่าย</th>
                <th className="p-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2">
                    <Input
                      value={item.name}
                      onChange={(e) =>
                        handleItemChange(index, "name", e.target.value)
                      }
                      placeholder="เลือกสินค้า/บริการ"
                    />
                    <Textarea
                      className="mt-1 text-xs"
                      rows={2}
                      placeholder="คำอธิบายรายการ (ไม่เกิน 1,000 ตัวอักษร)"
                      maxLength={1000}
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, "description", e.target.value)
                      }
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "quantity",
                          Number(e.target.value)
                        )
                      }
                      className="text-right"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, "price", Number(e.target.value))
                      }
                      className="text-right"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.discount}
                      onChange={(e) =>
                        handleItemChange(
                          index,
                          "discount",
                          Number(e.target.value)
                        )
                      }
                      className="text-right"
                    />
                  </td>
                  <td className="p-2">
                    <Select
                      value={item.vat.toString()}
                      onValueChange={(value) =>
                        handleItemChange(index, "vat", Number(value))
                      }
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="%" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="7">7%</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-right">
                    {(item.quantity * item.price - item.discount).toFixed(2)}
                  </td>
                  <td className="p-2">
                    <Select
                      value={item.withholdingTax}
                      onValueChange={(value) =>
                        handleItemChange(index, "withholdingTax", value)
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="เลือก" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_specified">
                          ยังไม่ระบุ
                        </SelectItem>
                        <SelectItem value="withholding">
                          หัก ณ ที่จ่าย
                        </SelectItem>
                        <SelectItem value="no_withholding">
                          ไม่หัก ณ ที่จ่าย
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-2 text-center">
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 h-8 w-8 p-0"
                      >
                        ×
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" onClick={addItem} className="mt-2">
          + เพิ่มรายการใหม่
        </Button>
      </section>

      {/* Summary */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="font-semibold">สรุปข้อมูล</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-4">
            <div className="flex justify-between">
              <span>ส่วนลดรวม</span>
              <span>
                {items.reduce((sum, item) => sum + item.discount, 0).toFixed(2)}{" "}
                บาท
              </span>
            </div>
            {isTaxInvoice && (
              <div className="flex justify-between">
                <span>ภาษีมูลค่าเพิ่ม 7%</span>
                <span>{vatAmount.toFixed(2)} บาท</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>จำนวนเงินทั้งสิ้น</span>
              <span>{grandTotal.toFixed(2)} บาท</span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Section */}
      <section className="border rounded p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold">รับชำระเงิน</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">ขั้นสูง</span>
            <Switch
              checked={showAdvancedPayment}
              onCheckedChange={setShowAdvancedPayment}
              id="show-advanced-payment"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="font-medium">รับชำระเงินครั้งที่ 1</div>

          {/* Basic Payment Fields */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>วันที่ชำระ</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <Label>ช่องทางการชำระเงิน</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกช่องทาง" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">เงินสด</SelectItem>
                  <SelectItem value="transfer">โอนเงิน</SelectItem>
                  <SelectItem value="credit_card">บัตรเครดิต</SelectItem>
                  <SelectItem value="cheque">เช็คธนาคาร</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>จำนวนเงินที่ชำระ</Label>
              <Input
                type="number"
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Advanced Payment Fields - Conditionally Rendered */}
          {showAdvancedPayment && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="mt-2 flex items-center space-x-2">
                <Checkbox
                  id="adjustments-toggle"
                  checked={showAdjustments}
                  onCheckedChange={(checked) => setShowAdjustments(!!checked)}
                />
                <Label htmlFor="adjustments-toggle" className="text-sm">
                  ตัดชำระกับเอกสาร
                </Label>
              </div>

              {showAdjustments && (
                <div className="space-y-4 pl-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>ประเภทเอกสาร</Label>
                      <Select
                        value={documentType}
                        onValueChange={setDocumentType}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภทเอกสาร" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="credit_note">ใบลดหนี้</SelectItem>
                          <SelectItem value="debit_note">
                            ใบเพิ่มหนี้
                          </SelectItem>
                          <SelectItem value="receipt">
                            ใบเสร็จรับเงิน
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>เลขที่เอกสาร</Label>
                      <Input
                        placeholder="ระบุเลขที่เอกสาร"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>จำนวนเงินที่ชำระ</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={adjustmentAmount || ""}
                        onChange={(e) =>
                          setAdjustmentAmount(Number(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="text-right pr-10"
                      />
                      <span className="absolute right-2.5 top-2 text-gray-500">
                        บาท
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>หมายเหตุ</Label>
                    <Input
                      value={adjustmentNote}
                      onChange={(e) => setAdjustmentNote(e.target.value)}
                      placeholder="ระบุหมายเหตุเพิ่มเติม"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Summary */}
          <div className="bg-gray-50 p-4 rounded space-y-2">
            <div className="flex justify-between">
              <span>รับชำระด้วยเงินรวม :</span>
              <span className="font-medium">
                {amountReceived.toFixed(2)} บาท
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span>รับชำระรวมทั้งสิ้น</span>
              <span className="font-medium">
                {amountReceived.toFixed(2)} บาท
              </span>
            </div>
            <div className="flex justify-between text-red-600 font-medium">
              <span>ต้องรับชำระเงินอีก</span>
              <span>{(grandTotal - amountReceived).toFixed(2)} บาท</span>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Notes */}
      <section className="border rounded p-4 space-y-2">
        <div className="flex justify-between items-center">
          <Label>หมายเหตุสำหรับลูกค้า</Label>
          <Button variant="ghost" size="sm" className="text-xs">
            ย่อ/ขยาย
          </Button>
        </div>
        <Textarea
          value={customerNotes}
          onChange={(e) => setCustomerNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="หมายเหตุที่จะแสดงในเอกสาร"
        />
        <div className="text-xs text-gray-500 text-right">
          {customerNotes.length}/1000 ตัวอักษร
        </div>
      </section>

      {/* File Attachments */}
      <section className="border rounded p-4 space-y-2">
        <div className="flex justify-between items-center">
          <Label>แนบไฟล์ในเอกสารนี้</Label>
          <Button variant="ghost" size="sm" className="text-xs">
            ย่อ/ขยาย
          </Button>
        </div>
        <div className="border-2 border-dashed rounded p-8 text-center">
          <p className="text-gray-500">
            ลากไฟล์มาวางที่นี่หรือคลิกเพื่ออัปโหลด
          </p>
          <p className="text-xs text-gray-400 mt-2">
            รองรับไฟล์รูปภาพและเอกสาร (สูงสุด 10MB)
          </p>
        </div>
      </section>

      {/* Tags */}
      <section className="border rounded p-4 space-y-2">
        <Label>แท็ก</Label>
        <div className="flex flex-wrap gap-2">
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="กรุณาเลือกแท็กที่ต้องการ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">ด่วน</SelectItem>
              <SelectItem value="pending">รอดำเนินการ</SelectItem>
              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <div>
          <Button variant="outline" className="mr-2">
            ยกเลิก
          </Button>
          <Button variant="outline">บันทึกร่าง</Button>
        </div>
        <div>
          <Button className="bg-green-600 hover:bg-green-700">
            อนุมัติใบเสร็จรับเงิน
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CreateReceipt;
