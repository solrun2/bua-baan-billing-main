import { getToken } from './auth';

export const fetchOrderCodes = async (): Promise<string[]> => {
  try {
    const token = await getToken();
    const response = await fetch("https://openapi.ketshopweb.com/api/orders", {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch order list:', response.status, response.statusText);
      throw new Error(`Failed to fetch order list: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Orders data received:', data);
    
    // Make sure data is an array and has ordercode
    if (!Array.isArray(data)) {
      console.error('Expected array but got:', typeof data);
      return [];
    }
    
    return data.map((order: any) => order.ordercode).filter(Boolean);
  } catch (error) {
    console.error('Error in fetchOrderCodes:', error);
    throw error;
  }
};
