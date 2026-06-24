export interface ProductCategoryDto {
  id: string;
  name: string;
}

export interface ProductDto {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  category: ProductCategoryDto | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock: number;
  categoryId?: string;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  categoryId?: string | null;
}

/** Supported sort options for product listing (`sort=price_desc`, etc.). */
export type ProductSort =
  | 'price_asc'
  | 'price_desc'
  | 'name_asc'
  | 'name_desc'
  | 'newest'
  | 'oldest';

export interface ProductSearchParams {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  sort: ProductSort;
}
