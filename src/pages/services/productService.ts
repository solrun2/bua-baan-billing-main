import { ProductListResponse } from "../../types/product";
import { getToken } from "./auth";

const API_BASE_URL = "https://openapi.ketshoptest.com";

export const productService = {
  async searchProducts(query: string): Promise<ProductListResponse> {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/product/list_all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          search: query,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await response.json();

      // Log complete response data
      console.log("Full API Response:", JSON.parse(JSON.stringify(data)));

      // Log each product's details
      if (data && Array.isArray(data.data)) {
        console.log("Products in response:");
        data.data.forEach((product: any, index: number) => {
          console.log(`[${index}]`, {
            id: product.id,
            title: product.title,
            sku: product.sku,
            price: product.price,
            product_type: product.product_type,
            property_option: product.property_option,
            properties_desc: product.properties_desc,
            properties_desc2: product.properties_desc2
          });
        });
      }

      // Remove duplicate products by ID
      if (data && Array.isArray(data.data)) {
        const uniqueProducts = [];
        const seenIds = new Set();

        for (const product of data.data) {
          if (!seenIds.has(product.id)) {
            seenIds.add(product.id);
            uniqueProducts.push(product);
          } else {
            console.log(
              "Found duplicate product ID:",
              product.id,
              product.title
            );
          }
        }

        if (uniqueProducts.length !== data.data.length) {
          console.log(
            `Removed ${
              data.data.length - uniqueProducts.length
            } duplicate products`
          );
        }

        return {
          ...data,
          data: uniqueProducts,
          count: uniqueProducts.length,
        };
      }

      return data;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  },
  async createProduct(productData: {
    name: string;
    sku: string;
    price: number;
    instock: number;
    product_type: string;
    status: number;
  }): Promise<{ success: boolean; product?: any; error?: string }> {
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/product/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: productData.name,
          sku: productData.sku,
          price: productData.price,
          instock: productData.instock,
          product_type: productData.product_type,
          status: productData.status,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create product");
      }

      const data = await response.json();
      return { success: true, product: data };
    } catch (error) {
      console.error("Error creating product:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create product",
      };
    }
  },
};
