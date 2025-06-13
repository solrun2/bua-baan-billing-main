import { getToken } from "./auth";

export const fetchOrderCodes = async (): Promise<string[]> => {
  try {
    const token = await getToken();
    const response = await fetch("https://openapi.ketshoptest.com/order", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        "Failed to fetch order list:",
        response.status,
        response.statusText
      );
      throw new Error(
        `Failed to fetch order list: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Orders data received:", data);

    if (!Array.isArray(data)) {
      console.error("Expected array but got:", typeof data);
      return [];
    }

    return data.map((order: any) => order.ordercode).filter(Boolean);
  } catch (error) {
    console.error("Error in fetchOrderCodes:", error);
    throw error;
  }
};

export const fetchOrderByCode = async (orderCode: string): Promise<any> => {
  try {
    const token = await getToken();
    const response = await fetch(
      `https://openapi.ketshoptest.com/order/get/${orderCode}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to fetch order:",
        response.status,
        response.statusText
      );
      throw new Error(
        `Failed to fetch order: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log("Order data received:", data);

    return data;
  } catch (error) {
    console.error("Error in fetchOrderByCode:", error);
    throw error;
  }
};
