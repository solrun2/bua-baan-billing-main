import { Customer } from "../../types/customer";

const API_BASE_URL = "https://openapi.ketshoptest.com";
const API_TOKEN =
  "eyJhbGciOiJFZERTQSIsImtpZCI6IjAxOTc2Nzg5LWNkODktNzYyZS1iMTM5LTFkZjIzZTUyYzQ3YiJ9.eyJjbGllbnRfaWQiOiIwMTk3Njc4OS1jZDg5LTc2MmUtYjEzOS0xZGYyM2U1MmM0N2IiLCJrZXRfd2ViX2lkIjoxMzE3LCJzY29wZXMiOlsiYWxsIl0sIm5hbWUiOiJJbnRlcm5zaGlwIiwiZG9tYWluIjoidWF0LmtldHNob3B0ZXN0LmNvbSIsInN1YiI6IjAxOTc2NzhiLTQ3YmUtNzA4YS04MTFkLWEwZWNiMDg1OTdiMCIsImlhdCI6MTc0OTc4ODg3MH0.OSbUayE_yS9IqOKLFrgsAGPJepiW7Otn3vzvE1SL9ijTpJmsGydGAP1_4AZA75cTmlXy583iS81EZxZszeYaBg";

export interface CustomerSearchParams {
  type: "id" | "phone" | "email";
  value: string;
}

export interface CustomerSearchResponse {
  _id: string;
  id?: string;
  name: string;
  username?: string;
  firstname?: string;
  lastname: string;
  tel: string;
  email?: string;
  address?: any;
}

/**
 * Check if the query is valid for customer search
 * Only id, phone, or email are supported by the API
 */
export function isValidCustomerQuery(query: string): boolean {
  if (!query || query.trim().length === 0) return false;

  const trimmedQuery = query.trim();

  // ID: all digits
  if (/^\d+$/.test(trimmedQuery)) return true;

  // Phone: 10 digits (Thai phone format)
  if (/^\d{10}$/.test(trimmedQuery)) return true;

  // Email: contains @ symbol
  if (trimmedQuery.includes("@")) return true;

  return false;
}

/**
 * Determine the search type based on the query
 */
export function getSearchType(query: string): "id" | "phone" | "email" | null {
  if (!query || query.trim().length === 0) return null;

  const trimmedQuery = query.trim();

  if (/^\d+$/.test(trimmedQuery)) return "id";
  if (/^\d{10}$/.test(trimmedQuery)) return "phone";
  if (trimmedQuery.includes("@")) return "email";

  return null;
}

/**
 * Search customers by id, phone, or email
 */
export async function searchCustomers(
  query: string,
  page = 1,
  limit = 20
): Promise<Customer[]> {
  try {
    // Validate query first
    if (!isValidCustomerQuery(query)) {
      return [];
    }

    const searchType = getSearchType(query);
    if (!searchType) {
      return [];
    }

    const requestBody: any = {
      type: searchType,
      value: query.trim(),
      page,
      limit,
    };

    const response = await fetch(`${API_BASE_URL}/customer/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();

      // Handle "Customer not found" as empty result, not error
      if (
        response.status === 400 &&
        errorData.message &&
        errorData.message.includes("Customer not found")
      ) {
        return [];
      }

      throw new Error(
        errorData.message ||
          `HTTP ${response.status}: Failed to search customers`
      );
    }

    const apiResponse = await response.json();
    const data: CustomerSearchResponse[] = apiResponse.data || [];

    // Transform API response to Customer type
    const customers: Customer[] = data.map((customer, idx) => ({
      id: customer._id || customer.id || customer.tel || String(idx),
      name: customer.name || customer.username || customer.firstname || "",
      lastname: customer.lastname || "",
      phone: customer.tel || "",
      email: customer.email || "",
      address:
        Array.isArray(customer.address) && customer.address.length > 0
          ? customer.address[0].address1
          : "",
      tax_id: "",
      tel: customer.tel || "",
    }));

    return customers;
  } catch (error) {
    throw new Error("Failed to search customers");
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const customers = await searchCustomers(id);
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    throw new Error("Failed to get customer");
  }
}

/**
 * Get customer by phone number
 */
export async function getCustomerByPhone(
  phone: string
): Promise<Customer | null> {
  try {
    const customers = await searchCustomers(phone);
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    throw new Error("Failed to get customer");
  }
}

/**
 * Get customer by email
 */
export async function getCustomerByEmail(
  email: string
): Promise<Customer | null> {
  try {
    const customers = await searchCustomers(email);
    return customers.length > 0 ? customers[0] : null;
  } catch (error) {
    throw new Error("Failed to get customer");
  }
}

export async function getAllCustomersInRange(): Promise<Customer[]> {
  // Example: fetch all customers, then filter by id range
  // Replace this with your actual API endpoint if available
  const response = await fetch(`${API_BASE_URL}/customers/all`, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
    },
  });
  const data = await response.json();
  return (data as Customer[]).filter((customer) => {
    const idNum = Number(customer.id);
    return !isNaN(idNum) && idNum >= 370 && idNum <= 70000;
  });
}
