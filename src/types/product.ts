export interface Product {
  id: number;
  title: string;
  name?: string;  // From ProductFormData
  description: string;
  sku: string;
  price: number;
  selling_price?: number;  // From ProductFormData
  purchase_price?: number;  // From ProductFormData
  instock: number;
  product_type: string;
  property_option: number;
  properties_desc: string;
  property_info: string;
  properties_desc2: string;
  property_info2: string;
  feature_img: string;
  status: number;
  unit?: string;  // From ProductFormData
  createdAt?: Date;  // Used in DocumentForm
  updatedAt?: Date;  // Used in DocumentForm
}

export interface ProductListResponse {
  count: number;
  data: Product[];
}
