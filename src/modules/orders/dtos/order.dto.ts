import type { OrderStatus } from '../constants/order-status.js';

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
}

export interface OrderItemDto {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface OrderDto {
  id: string;
  userId: string;
  status: OrderStatus;
  total: number;
  items: OrderItemDto[];
  createdAt: Date;
}
