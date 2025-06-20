export interface Product {
  id: number;
  title: string;
  sku: string;
  price: number;
  instock: number;
  product_type: string;
  property_option: number;
  properties_desc: string;
  property_info: string;
  properties_desc2: string;
  property_info2: string;
  feature_img: string;
  status: number;
}

export interface ProductListResponse {
  count: number;
  data: Product[];
}
