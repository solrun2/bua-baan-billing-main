import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Edit,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Trash2,
} from "lucide-react";
import {
  companyInfoService,
  type CompanyInfo,
} from "@/services/companyInfoService";

const CompanyInfo = () => {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);
  const signatureFileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<CompanyInfo>({
    company_name_th: "",
    company_name_en: "",
    tax_id: "",
    business_type: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    bank_name: "",
    bank_branch: "",
    bank_account_number: "",
    bank_account_name: "",
    logo: "",
    digital_signature: "",
  });
  const { toast } = useToast();

  // ดึงข้อมูลบริษัทเมื่อโหลดหน้า
  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const data = await companyInfoService.getCompanyInfo();
      if (data) {
        setCompanyInfo(data);
        setFormData(data);
      }
    } catch (error) {
      console.error("Failed to fetch company info:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถดึงข้อมูลบริษัทได้",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof CompanyInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!formData.company_name_th.trim()) {
      toast({
        title: "ข้อมูลไม่ครบถ้วน",
        description: "กรุณากรอกชื่อบริษัท (ภาษาไทย)",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await companyInfoService.saveCompanyInfo({
        ...formData,
        id: companyInfo?.id,
      });

      if (result.success) {
        toast({
          title: "บันทึกสำเร็จ",
          description: "ข้อมูลบริษัทถูกบันทึกเรียบร้อยแล้ว",
        });
        setIsEditing(false);
        await fetchCompanyInfo();
      }
    } catch (error) {
      console.error("Failed to save company info:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกข้อมูลบริษัทได้",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData(
      companyInfo || {
        company_name_th: "",
        company_name_en: "",
        tax_id: "",
        business_type: "",
        address: "",
        phone: "",
        email: "",
        website: "",
        bank_name: "",
        bank_branch: "",
        bank_account_number: "",
        bank_account_name: "",
        logo: "",
        digital_signature: "",
      }
    );
    setIsEditing(false);
  };

  // ฟังก์ชันอัปโหลดโลโก้
  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "ประเภทไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF) เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ไฟล์มีขนาดใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const result = await companyInfoService.uploadLogo(file);
      if (result.success && result.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          logo: result.imageUrl,
        }));
        toast({
          title: "อัปโหลดสำเร็จ",
          description: "โลโก้ถูกอัปโหลดเรียบร้อยแล้ว",
        });
      } else {
        toast({
          title: "อัปโหลดล้มเหลว",
          description: "ไม่สามารถอัปโหลดโลโก้ได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดโลโก้ได้",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // ฟังก์ชันอัปโหลดลายเซ็น
  const handleSignatureUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "ประเภทไฟล์ไม่ถูกต้อง",
        description: "กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, GIF) เท่านั้น",
        variant: "destructive",
      });
      return;
    }

    // ตรวจสอบขนาดไฟล์ (ไม่เกิน 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "ไฟล์มีขนาดใหญ่เกินไป",
        description: "กรุณาเลือกไฟล์ที่มีขนาดไม่เกิน 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingSignature(true);
    try {
      const result = await companyInfoService.uploadSignature(file);
      if (result.success && result.imageUrl) {
        setFormData((prev) => ({
          ...prev,
          digital_signature: result.imageUrl,
        }));
        toast({
          title: "อัปโหลดสำเร็จ",
          description: "ลายเซ็นถูกอัปโหลดเรียบร้อยแล้ว",
        });
      } else {
        toast({
          title: "อัปโหลดล้มเหลว",
          description: "ไม่สามารถอัปโหลดลายเซ็นได้",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to upload signature:", error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถอัปโหลดลายเซ็นได้",
        variant: "destructive",
      });
    } finally {
      setIsUploadingSignature(false);
    }
  };

  // ฟังก์ชันลบโลโก้
  const removeLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logo: undefined,
    }));
    toast({
      title: "ลบสำเร็จ",
      description: "โลโก้ถูกลบเรียบร้อยแล้ว",
    });
  };

  // ฟังก์ชันลบลายเซ็น
  const removeSignature = () => {
    setFormData((prev) => ({
      ...prev,
      digital_signature: undefined,
    }));
    toast({
      title: "ลบสำเร็จ",
      description: "ลายเซ็นถูกลบเรียบร้อยแล้ว",
    });
  };

  const renderField = (
    label: string,
    value: string | undefined,
    field: keyof CompanyInfo
  ) => {
    if (isEditing) {
      return (
        <div>
          <Label
            htmlFor={field}
            className="text-sm font-medium text-muted-foreground"
          >
            {label}
          </Label>
          {field === "address" ? (
            <Textarea
              id={field}
              value={formData[field] || ""}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={`กรอก${label}`}
              className="mt-1"
            />
          ) : (
            <Input
              id={field}
              value={formData[field] || ""}
              onChange={(e) => handleInputChange(field, e.target.value)}
              placeholder={`กรอก${label}`}
              className="mt-1"
            />
          )}
        </div>
      );
    }

    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">
          {label}
        </label>
        <p className="text-foreground font-medium">{value || "-"}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <Building className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">ข้อมูลบริษัท</h1>
            <p className="text-muted-foreground">
              จัดการข้อมูลบริษัทและรายละเอียดติดต่อ
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isLoading ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                ยกเลิก
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              แก้ไขข้อมูล
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลทั่วไป</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField(
              "ชื่อบริษัท (ภาษาไทย)",
              companyInfo?.company_name_th,
              "company_name_th"
            )}
            {renderField(
              "ชื่อบริษัท (ภาษาอังกฤษ)",
              companyInfo?.company_name_en,
              "company_name_en"
            )}
            {renderField(
              "เลขประจำตัวผู้เสียภาษี",
              companyInfo?.tax_id,
              "tax_id"
            )}
            {renderField(
              "ประเภทธุรกิจ",
              companyInfo?.business_type,
              "business_type"
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลติดต่อ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField("ที่อยู่", companyInfo?.address, "address")}
            {renderField("เบอร์โทรศัพท์", companyInfo?.phone, "phone")}
            {renderField("อีเมล", companyInfo?.email, "email")}
            {renderField("เว็บไซต์", companyInfo?.website, "website")}
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>ข้อมูลธนาคาร</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderField("ชื่อธนาคาร", companyInfo?.bank_name, "bank_name")}
            {renderField("สาขา", companyInfo?.bank_branch, "bank_branch")}
            {renderField(
              "เลขที่บัญชี",
              companyInfo?.bank_account_number,
              "bank_account_number"
            )}
            {renderField(
              "ชื่อบัญชี",
              companyInfo?.bank_account_name,
              "bank_account_name"
            )}
          </CardContent>
        </Card>

        <Card className="border border-border/40">
          <CardHeader>
            <CardTitle>โลโก้และลายเซ็น</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Hidden file inputs */}
            <input
              type="file"
              ref={logoFileInputRef}
              onChange={handleLogoUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif"
              className="hidden"
            />
            <input
              type="file"
              ref={signatureFileInputRef}
              onChange={handleSignatureUpload}
              accept="image/jpeg,image/jpg,image/png,image/gif"
              className="hidden"
            />

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                โลโก้บริษัท
              </Label>
              <div className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground relative">
                {formData.logo ? (
                  <>
                    <img
                      src={formData.logo}
                      alt="Company Logo"
                      className="max-w-full max-h-full object-contain"
                    />
                    {isEditing && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removeLogo}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                    <p>ยังไม่มีโลโก้</p>
                  </div>
                )}
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingLogo ? "กำลังอัปโหลด..." : "อัปโหลดโลโก้"}
                </Button>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground">
                ลายเซ็นดิจิทัล
              </Label>
              <div className="mt-2 w-full h-32 border-2 border-dashed border-border rounded-lg flex items-center justify-center text-muted-foreground relative">
                {formData.digital_signature ? (
                  <>
                    <img
                      src={formData.digital_signature}
                      alt="Digital Signature"
                      className="max-w-full max-h-full object-contain"
                    />
                    {isEditing && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={removeSignature}
                        className="absolute top-2 right-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p>ลายเซ็นกรรมการผู้จัดการ</p>
                  </div>
                )}
              </div>
              {isEditing && (
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => signatureFileInputRef.current?.click()}
                  disabled={isUploadingSignature}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {isUploadingSignature ? "กำลังอัปโหลด..." : "อัปโหลดลายเซ็น"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanyInfo;
