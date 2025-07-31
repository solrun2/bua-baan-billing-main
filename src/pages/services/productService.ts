// Ketshop API integration for product
const BASE_URL = "https://openapi.ketshoptest.com";
const accessToken =
  "eyJhbGciOiJFZERTQSIsImtpZCI6IjAxOTc2Nzg5LWNkODktNzYyZS1iMTM5LTFkZjIzZTUyYzQ3YiJ9.eyJjbGllbnRfaWQiOiIwMTk3Njc4OS1jZDg5LTc2MmUtYjEzOS0xZGYyM2U1MmM0N2IiLCJrZXRfd2ViX2lkIjoxMzE3LCJzY29wZXMiOlsiYWxsIl0sIm5hbWUiOiJJbnRlcm5zaGlwIiwiZG9tYWluIjoidWF0LmtldHNob3B0ZXN0LmNvbSIsInN1YiI6IjAxOTc2NzhiLTQ3YmUtNzA4YS04MTFkLWEwZWNiMDg1OTdiMCIsImlhdCI6MTc0OTc4ODg3MH0.OSbUayE_yS9IqOKLFrgsAGPJepiW7Otn3vzvE1SL9ijTpJmsGydGAP1_4AZA75cTmlXy583iS81EZxZszeYaBg";

const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json",
};

export async function searchProducts(query = "", page = 1, limit = 100) {
  let body: any = { page, limit };
  if (query) {
    if (/^\d+$/.test(query)) {
      // If query is all digits, treat as product id
      body.id = query;
    } else {
      body.keyword = query;
    }
  }
  const res = await fetch(`${BASE_URL}/product/search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  const data = await res.json();

  return data.data;
}

export async function createProduct(product: any) {
  const res = await fetch(`${BASE_URL}/product/create`, {
    method: "POST",
    headers,
    body: JSON.stringify(product),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return await res.json();
}

export async function updateProduct(product: any) {
  const res = await fetch(`${BASE_URL}/product/update`, {
    method: "PUT",
    headers,
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "Failed to update product");
  }
  return await res.json();
}

export async function fetchAllProducts() {
  const allProducts: any[] = [];
  let page = 1;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const products = await searchProducts("", page, limit);
    allProducts.push(...products);
    if (products.length < limit) {
      hasMore = false;
    } else {
      page += 1;
    }
  }
  return allProducts;
}

export async function getProductById(id: string | number) {
  const products = await searchProducts(String(id));
  return products && products.length > 0 ? products[0] : null;
}
