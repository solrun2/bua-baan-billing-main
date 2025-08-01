import { useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiService } from "@/pages/services/apiService";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { updateProduct as ketshopUpdateProduct, createProduct } from "@/pages/services/productService";

type ProductType = "product" | "service";
type CostingMethod = "FIFO" | "LIFO" | "Average" | "Specific";

interface ProductLot {
  id: string;
  purchaseDate: string;
  quantity: number;
  purchasePricePerUnit: number;
}

export interface ProductFormData {
  id?: string;
  product_type: ProductType;
  name: string;
  sku: string;
  unit: string;
  feature_img: string;
  selling_price: number;
  purchase_price: number;
  status: number; 
  instock?: number;
  description?: string;
  has_barcode?: boolean;
  barcode?: string;
  selling_vat_rate?: number;
  purchase_vat_rate?: number;
  sales_account?: string;
  purchase_account?: string;
  calculate_cogs_on_sale?: boolean;
  cogs_account?: string;
  costing_method?: CostingMethod;
  opening_balance_lots?: ProductLot[];
}

const initialFormData: ProductFormData = {
  product_type: "product",
  name: "",
  sku: "",
  unit: "ชิ้น",
  feature_img: "",
  selling_price: 0,
  purchase_price: 0,
  status: 1,
  instock: 0,
  description: "",
  has_barcode: false,
  barcode: "",
  selling_vat_rate: 0,
  purchase_vat_rate: 0,
  sales_account: "",
  purchase_account: "",
  calculate_cogs_on_sale: true,
  cogs_account: "",
  costing_method: "FIFO",
  opening_balance_lots: [],
};


const costingMethodOptions: CostingMethod[] = [
  "FIFO",
  "LIFO",
  "Average",
  "Specific",
];

interface ProductFormProps {
  onSuccess?: (newProduct: ProductFormData) => void;
  onCancel?: () => void;
  initialData?: Partial<ProductFormData>;
}

export function ProductForm({ onSuccess, onCancel, initialData }: ProductFormProps) {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProductFormData>({
    ...initialFormData,
    ...initialData,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [unitOptions, setUnitOptions] = useState(["ชิ้น", "อัน", "กล่อง", "โหล", "เมตร", "กิโลกรัม", "ลิตร"]);
  const [isUnitDialogOpen, setIsUnitDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState(""); // Will be phased out by newUnitNameTh/En
  const [newUnitCode, setNewUnitCode] = useState("");
  const [newUnitNameTh, setNewUnitNameTh] = useState("");
  const [newUnitNameEn, setNewUnitNameEn] = useState("");
  const [formMode, setFormMode] = useState<'basic' | 'advanced'>('basic');
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.feature_img || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleAddNewUnit = () => {
    if (newUnitNameTh.trim() && !unitOptions.includes(newUnitNameTh.trim())) { // Basic check using TH name for now
      const updatedOptions = [...unitOptions, newUnitNameTh.trim()]; // Storing TH name string for now
      setUnitOptions(updatedOptions);
      setFormData((prev) => ({ ...prev, unit: newUnitNameTh.trim() })); // Storing TH name string for now
      setNewUnitCode("");
      setNewUnitNameTh("");
      setNewUnitNameEn("");
      setIsUnitDialogOpen(false);
      toast.success(`${formData.product_type === 'service' ? 'เพิ่มหน่วยบริการใหม่' : 'เพิ่มหน่วยนับใหม่'} "${newUnitNameTh.trim()}" เรียบร้อยแล้ว`);
    } else if (unitOptions.includes(newUnitName.trim())) {
      toast.error(`หน่วย${formData.product_type === 'service' ? 'บริการ' : 'นับ'}นี้มีอยู่แล้ว`);
    } else {
      toast.error(`กรุณากรอกชื่อหน่วย${formData.product_type === 'service' ? 'บริการ' : 'นับ'} (TH)`);
    }
  };



  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? parseFloat(value) || 0 : value,
      }));
    }
  };

  const handleSelectChange = (name: keyof ProductFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSwitchChange = (name: keyof ProductFormData, checked: boolean) => {
    setFormData((prev) => {
      const newState = { ...prev, [name]: checked };
      if (name === 'has_barcode' && !checked) {
        newState.barcode = '';
      }
      if (name === 'calculate_cogs_on_sale' && !checked) {
        newState.cogs_account = '';
      }
      return newState;
    });
  };

  const addLot = () => {
    setFormData((prev) => ({
      ...prev,
      opening_balance_lots: [
        ...(prev.opening_balance_lots || []),
        {
          id: uuidv4(),
          purchaseDate: "",
          quantity: 0,
          purchasePricePerUnit: 0,
        },
      ],
    }));
  };

  const updateLot = (
    id: string,
    field: keyof ProductLot,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      opening_balance_lots: (prev.opening_balance_lots || []).map((lot) =>
        lot.id === id
          ? {
              ...lot,
              [field]:
                typeof value === "number"
                  ? parseFloat(value.toString()) || 0
                  : value,
            }
          : lot
      ),
    }));
  };

  const removeLot = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      opening_balance_lots: (prev.opening_balance_lots || []).filter(
        (lot) => lot.id !== id
      ),
    }));
  };

  const handleSuccess = (newProduct: ProductFormData) => {
    if (onSuccess) {
      onSuccess(newProduct);
    } else {
      navigate(-1); // Default fallback
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate(-1); // Default fallback
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let productData = { ...formData };

    if (selectedFile) {
      try {
        const imageUrl = await apiService.uploadImage(selectedFile);

        if (imageUrl) {
          productData.feature_img = imageUrl;
        } else {
          throw new Error("Image upload failed to return a URL.");
        }
      } catch (error: any) {
        console.error("Image upload error:", error);
        toast.error("เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ", { description: error.message });
        setIsLoading(false);
        return; 
      }
    }

    try {
      if (productData.id) {
        const updatedProduct = await ketshopUpdateProduct(productData);
        toast.success("อัปเดตข้อมูลสินค้าสำเร็จแล้ว");
        handleSuccess({ ...updatedProduct, id: updatedProduct.id.toString() } as ProductFormData);
      } else {
        const result = await createProduct(productData);
        if (result.success && result.product) {
          toast.success("สร้างสินค้าใหม่สำเร็จแล้ว");
          handleSuccess({ ...result.product, id: result.product.id.toString() } as ProductFormData);
        } else {
          throw new Error(result.error || "An unknown error occurred during product creation.");
        }
      }
    } catch (error: any) {
      console.error("Failed to save product:", error);
      const errorMsg = error.response?.data?.message || error.message || "เกิดข้อผิดพลาดบางอย่าง";
      toast.error("ไม่สามารถบันทึกข้อมูลสินค้าได้", {
        description: errorMsg,
      });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-semibold">
          {formData.product_type === 'service' ? (initialData ? "แก้ไขบริการ" : "เพิ่มบริการใหม่") : (initialData ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่")}
        </h2>
        <div className="space-y-2 w-48">
          <Label htmlFor="sku">{formData.product_type === 'service' ? 'เลขที่บริการ' : 'เลขที่สินค้า'}</Label>
          <Input
            id="sku"
            name="sku"
            value={formData.sku || ''}
            placeholder="จะสร้างโดยอัตโนมัติ"
            disabled
          />
        </div>
      </div>
      <div className="flex items-center space-x-2 mb-6">
        <Button
          type="button"
          variant={formMode === 'basic' ? 'default' : 'outline'}
          onClick={() => setFormMode('basic')}
          size="sm"
        >
          พื้นฐาน
        </Button>
        <Button
          type="button"
          variant={formMode === 'advanced' ? 'default' : 'outline'}
          onClick={() => setFormMode('advanced')}
          size="sm"
        >
          ขั้นสูง
        </Button>
      </div>

      {/* ประเภท */}
      <section className="p-6 border rounded-lg space-y-4">
        <h3 className="text-lg font-medium">ประเภท</h3>
        <RadioGroup
          name="product_type"
          value={formData.product_type}
          onValueChange={(value) => handleSelectChange("product_type", value as ProductType)}
          className="flex space-x-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="product" id="r_product" />
            <Label htmlFor="r_product">สินค้า</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="service" id="r_service" />
            <Label htmlFor="r_service">บริการ</Label>
          </div>
        </RadioGroup>
      </section>

      {/* ข้อมูลสินค้า */}
      <section className="p-6 border rounded-lg space-y-6">
        <h3 className="text-lg font-medium">{formData.product_type === 'service' ? 'ข้อมูลบริการ' : 'ข้อมูลสินค้า'}</h3>
        <div className="space-y-2">
          <Label htmlFor="name">{formData.product_type === 'service' ? 'ชื่อบริการ' : 'ชื่อสินค้า'} *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        {formMode === 'advanced' && (
          <div className="space-y-2">
            <Label htmlFor="description">{formData.product_type === 'service' ? 'คำบรรยายบริการ' : 'คำบรรยายสินค้า'}</Label>
            <Textarea id="description" name="description" value={formData.description || ""} onChange={handleChange} />
          </div>
        )}
        {formMode === 'advanced' && (
          <>
            <div className="flex items-center space-x-2">
              <Switch id="has_barcode" name="has_barcode" checked={!!formData.has_barcode} onCheckedChange={(checked) => handleSwitchChange('has_barcode', checked)} />
              <Label htmlFor="has_barcode">มีรหัสบาร์โค้ด</Label>
            </div>
            {formData.has_barcode && (
              <div className="space-y-2 pl-8">
                <Label htmlFor="barcode">รหัสบาร์โค้ด</Label>
                <Input id="barcode" name="barcode" value={formData.barcode || ""} onChange={handleChange} />
              </div>
            )}
          </>
        )}
        <div className="flex items-end space-x-2">
            <div className="space-y-2">
            <Label htmlFor="unit">{formData.product_type === 'service' ? 'หน่วยบริการ' : 'หน่วยนับ'}</Label>
            <div className="flex items-center space-x-2">
              <Select name="unit" value={formData.unit} onValueChange={(value) => handleSelectChange("unit", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {unitOptions.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                </SelectContent>
              </Select>
              <Dialog open={isUnitDialogOpen} onOpenChange={setIsUnitDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> {formData.product_type === 'service' ? 'สร้างหน่วยบริการใหม่' : 'สร้างหน่วยนับใหม่'}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{formData.product_type === 'service' ? 'สร้างหน่วยบริการใหม่' : 'สร้างหน่วยนับใหม่'}</DialogTitle>
                    <DialogDescription>
                      {formData.product_type === 'service' ? 'กรอกชื่อหน่วยบริการที่คุณต้องการเพิ่ม' : 'กรอกชื่อหน่วยนับที่คุณต้องการเพิ่ม'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="flex flex-col items-center space-y-2 col-span-1 md:col-span-1">
                      <Label htmlFor="product-image-upload" className="cursor-pointer w-40">
                        <div className="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          {imagePreview ? (
                            <img
                              src={imagePreview}
                              alt={formData.name || "Product image"}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center p-2">
                              <Plus className="mx-auto h-8 w-8" />
                              <span className="text-xs">แนบรูปภาพ</span>
                            </div>
                          )}
                        </div>
                      </Label>
                      <Input
                        id="product-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-unit-name-th" className="text-right">
                        {formData.product_type === 'service' ? 'ชื่อหน่วยบริการ (TH)' : 'ชื่อหน่วยนับ (TH)'}
                      </Label>
                      <Input
                        id="new-unit-name-th"
                        value={newUnitNameTh}
                        onChange={(e) => setNewUnitNameTh(e.target.value)}
                        className="col-span-3"
                        maxLength={20}
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="new-unit-name-en" className="text-right">
                        {formData.product_type === 'service' ? 'ชื่อหน่วยบริการ (EN)' : 'ชื่อหน่วยนับ (EN)'}
                      </Label>
                      <Input
                        id="new-unit-name-en"
                        value={newUnitNameEn}
                        onChange={(e) => setNewUnitNameEn(e.target.value)}
                        className="col-span-3"
                        maxLength={20}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsUnitDialogOpen(false)}>ยกเลิก</Button>
                    <Button type="button" onClick={handleAddNewUnit}>
                      <Plus className="mr-2 h-4 w-4" /> 
                      {formData.product_type === 'service' ? 'เพิ่มหน่วยบริการ' : 'เพิ่มหน่วยนับ'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </section>

      {/* รูปสินค้า */}
      {formData.product_type === 'product' && (
        <section className="p-6 border rounded-lg space-y-4">
          <h3 className="text-lg font-medium">รูปสินค้า</h3>
          <div className="flex justify-center">
            <div className="flex flex-col items-center space-y-2">
              <Label htmlFor="product-image-upload" className="cursor-pointer">
                <div className="w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={formData.name || "Product image"}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center p-2">
                      <Plus className="mx-auto h-8 w-8" />
                      <span className="text-xs">แนบรูปภาพ</span>
                    </div>
                  )}
                </div>
              </Label>
              <Input
                id="product-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>
        </section>
      )}

      {/* ข้อมูลราคามาตรฐาน */}
      <section className="p-6 border rounded-lg space-y-6">
        <h3 className="text-lg font-medium">ข้อมูลราคามาตรฐาน</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="selling_price">ราคาขาย/หน่วย *</Label>
            <Input id="selling_price" name="selling_price" type="number" value={formData.selling_price} onChange={handleChange} required />
          </div>
          {formMode === 'advanced' && (
            <div className="space-y-2">
              <Label htmlFor="selling_vat_rate">อัตราภาษีมูลค่าเพิ่ม (ขาย)</Label>
              <Input id="selling_vat_rate" name="selling_vat_rate" type="number" value={formData.selling_vat_rate || 0} onChange={handleChange} />
            </div>
          )}
          {formData.product_type === 'product' && <div className="space-y-2">
            <Label htmlFor="purchase_price">ราคาซื้อ/หน่วย</Label>
            <Input id="purchase_price" name="purchase_price" type="number" value={formData.purchase_price} onChange={handleChange} />
          </div>}
          {formMode === 'advanced' && formData.product_type === 'product' && (
            <div className="space-y-2">
              <Label htmlFor="purchase_vat_rate">อัตราภาษีมูลค่าเพิ่ม (ซื้อ)</Label>
              <Input id="purchase_vat_rate" name="purchase_vat_rate" type="number" value={formData.purchase_vat_rate || 0} onChange={handleChange} />
            </div>
          )}
        </div>
      </section>

      {/* ข้อมูลการบันทึกบัญชี */}
      {formMode === 'advanced' && (
        <section className="p-6 border rounded-lg space-y-6">
        <h3 className="text-lg font-medium">ข้อมูลการบันทึกบัญชี</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <Label htmlFor="sales_account">บันทึกบัญชีขาย</Label>
                <Input id="sales_account" name="sales_account" value={formData.sales_account || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="purchase_account">บันทึกบัญชีซื้อ</Label>
                <Input id="purchase_account" name="purchase_account" value={formData.purchase_account || ""} onChange={handleChange} />
            </div>
        </div>
        {formData.product_type === 'product' && <>
          <div className="flex items-center space-x-2 pt-4">
              <Switch id="calculate_cogs_on_sale" name="calculate_cogs_on_sale" checked={!!formData.calculate_cogs_on_sale} onCheckedChange={(checked) => handleSwitchChange('calculate_cogs_on_sale', checked)} />
              <Label htmlFor="calculate_cogs_on_sale">คำนวณต้นทุนเมื่อขาย</Label>
          </div>
          {formData.calculate_cogs_on_sale && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8">
                  <div className="space-y-2">
                      <Label htmlFor="cogs_account">บันทึกบัญชีต้นทุนขาย</Label>
                      <Input id="cogs_account" name="cogs_account" value={formData.cogs_account || ""} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="costing_method">วิธีคำนวณต้นทุน</Label>
                      <Select name="costing_method" value={formData.costing_method} onValueChange={(value) => handleSelectChange("costing_method", value as CostingMethod)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                          {costingMethodOptions.map((opt) => (<SelectItem key={opt} value={opt}>{opt}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </div>
              </div>
          )}
        </>}
      </section>
      )}

      {/* ข้อมูลยอดยกมา */}
      {formMode === 'advanced' && formData.product_type === 'product' && (
        <section className="p-6 border rounded-lg space-y-6">
        <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">ข้อมูลยอดยกมา</h3>
            <Button type="button" variant="outline" size="sm" onClick={addLot}><Plus className="mr-2 h-4 w-4" /> เพิ่ม Lot สินค้ายกมา</Button>
        </div>
        <div className="space-y-4">
        {(formData.opening_balance_lots || []).map((lot, index) => (
            <div key={lot.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-md relative">
                <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 text-destructive" onClick={() => removeLot(lot.id)}><Trash2 className="h-4 w-4" /></Button>
                <p className="md:col-span-4 text-sm font-medium">Lot {index + 1}</p>
                <div className="space-y-1">
                    <Label htmlFor={`lot_date_${lot.id}`}>วันที่ซื้อสินค้า</Label>
                    <Input id={`lot_date_${lot.id}`} type="date" value={lot.purchaseDate} onChange={(e) => updateLot(lot.id, "purchaseDate", e.target.value)} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor={`lot_qty_${lot.id}`}>จำนวนหน่วยยกมา</Label>
                    <Input id={`lot_qty_${lot.id}`} type="number" value={lot.quantity} onChange={(e) => updateLot(lot.id, "quantity", parseFloat(e.target.value))} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor={`lot_price_${lot.id}`}>ราคาต่อหน่วยยกมา</Label>
                    <Input id={`lot_price_${lot.id}`} type="number" value={lot.purchasePricePerUnit} onChange={(e) => updateLot(lot.id, "purchasePricePerUnit", parseFloat(e.target.value))} />
                </div>
            </div>
        ))}
        {(!formData.opening_balance_lots || formData.opening_balance_lots.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-4">ยังไม่มีการเพิ่ม Lot สินค้ายกมา</p>
        )}
        </div>
        </section>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-6 border-t mt-8">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading} className="min-w-[120px]">
          ยกเลิก
        </Button>
        <Button type="submit" disabled={isLoading} className="min-w-[120px]">
          {isLoading ? "กำลังบันทึก..." : (initialData ? "อัปเดต" : "บันทึก")}
        </Button>
      </div>
    </form>
  );
}
