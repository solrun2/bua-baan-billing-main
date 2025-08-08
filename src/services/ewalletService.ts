import { apiService } from "../pages/services/apiService";

export interface Ewallet {
  id: number;
  wallet_name: string;
  wallet_type:
    | "Shopee"
    | "Lazada"
    | "Grab"
    | "Line"
    | "TrueMoney"
    | "PromptPay"
    | "อื่นๆ";
  account_number: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashFlowEntry {
  id: number;
  date: string;
  description: string;
  type: "income" | "expense";
  amount: number;
  balance_after: number;
}

export const ewalletService = {
  // ดึงข้อมูล e-wallet ทั้งหมด
  async getEwallets(): Promise<Ewallet[]> {
    const response = await apiService.get("/ewallets");
    return response;
  },

  // ดึงข้อมูล e-wallet ตาม ID
  async getEwallet(id: number): Promise<Ewallet> {
    const response = await apiService.get(`/ewallets/${id}`);
    return response;
  },

  // สร้าง e-wallet ใหม่
  async createEwallet(data: {
    wallet_name: string;
    wallet_type: string;
    account_number: string;
    current_balance?: number;
  }): Promise<{ success: boolean; id: number }> {
    const response = await apiService.post("/ewallets", data);
    return response;
  },

  // อัปเดตข้อมูล e-wallet
  async updateEwallet(
    id: number,
    data: {
      wallet_name: string;
      wallet_type: string;
      account_number: string;
      current_balance?: number;
      is_active?: boolean;
    }
  ): Promise<{ success: boolean }> {
    const response = await apiService.put(`/ewallets/${id}`, data);
    return response;
  },

  // ลบ e-wallet
  async deleteEwallet(id: number): Promise<{ success: boolean }> {
    const response = await apiService.delete(`/ewallets/${id}`);
    return response;
  },

  // ดึงข้อมูล cash flow ของ e-wallet
  async getCashFlowByEwallet(id: number): Promise<CashFlowEntry[]> {
    const response = await apiService.get(`/cash-flow?ewallet_id=${id}`);
    return response;
  },
};
