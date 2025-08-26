import { apiService } from "@/pages/services/apiService";

export interface CompanyInfo {
  id?: number;
  company_name_th: string;
  company_name_en?: string;
  tax_id?: string;
  business_type?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  digital_signature?: string;
  logo?: string;
  created_at?: string;
  updated_at?: string;
}

export const companyInfoService = {
  // ดึงข้อมูลบริษัท
  async getCompanyInfo(): Promise<CompanyInfo | null> {
    try {
      const response = await apiService.get("/company-info");
      return response;
    } catch (error) {
      console.error("Failed to fetch company info:", error);
      return null;
    }
  },

  // สร้างข้อมูลบริษัทใหม่
  async createCompanyInfo(
    data: CompanyInfo
  ): Promise<{ success: boolean; id?: number }> {
    try {
      const response = await apiService.post("/company-info", data);
      return response;
    } catch (error) {
      console.error("Failed to create company info:", error);
      throw error;
    }
  },

  // อัปเดตข้อมูลบริษัท
  async updateCompanyInfo(
    id: number,
    data: CompanyInfo
  ): Promise<{ success: boolean }> {
    try {
      const response = await apiService.put(`/company-info/${id}`, data);
      return response;
    } catch (error) {
      console.error("Failed to update company info:", error);
      throw error;
    }
  },

  // บันทึกข้อมูลบริษัท (สร้างใหม่หรืออัปเดต)
  async saveCompanyInfo(
    data: CompanyInfo
  ): Promise<{ success: boolean; id?: number }> {
    try {
      if (data.id) {
        // อัปเดตข้อมูลที่มีอยู่
        await this.updateCompanyInfo(data.id, data);
        return { success: true, id: data.id };
      } else {
        // สร้างข้อมูลใหม่
        return await this.createCompanyInfo(data);
      }
    } catch (error) {
      console.error("Failed to save company info:", error);
      throw error;
    }
  },

  // อัปโหลดโลโก้บริษัท
  async uploadLogo(file: File): Promise<{ success: boolean; imageUrl?: string }> {
    try {
      const formData = new FormData();
      formData.append("logo", file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/logo`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const result = await response.json();
      return { success: true, imageUrl: result.imageUrl };
    } catch (error) {
      console.error("Failed to upload logo:", error);
      return { success: false };
    }
  },

  // อัปโหลดลายเซ็นดิจิทัล
  async uploadSignature(file: File): Promise<{ success: boolean; imageUrl?: string }> {
    try {
      const formData = new FormData();
      formData.append("signature", file);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/upload/signature`, {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const result = await response.json();
      return { success: true, imageUrl: result.imageUrl };
    } catch (error) {
      console.error("Failed to upload signature:", error);
      return { success: false };
    }
  },
};
