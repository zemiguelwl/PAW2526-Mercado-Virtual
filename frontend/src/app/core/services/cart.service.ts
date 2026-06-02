import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ProductUnit = 'unit' | 'kg' | 'liter';

export interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  productImage: string;
  quantity: number;
  stock: number;
  unit: ProductUnit;
}

export interface Cart {
  supermarketId: string | null;
  supermarketName: string;
  items: CartItem[];
}

// Opções de quantidade disponíveis para produtos ao kg/litro
export const KG_OPTIONS = [
  { value: 0.1, label: '100g' },
  { value: 0.2, label: '200g' },
  { value: 0.3, label: '300g' },
  { value: 0.4, label: '400g' },
  { value: 0.5, label: '500g' },
  { value: 1,   label: '1 kg' },
  { value: 2,   label: '2 kg' },
  { value: 3,   label: '3 kg' },
];

export const LITER_OPTIONS = [
  { value: 0.25, label: '250 ml' },
  { value: 0.5,  label: '500 ml' },
  { value: 1,    label: '1 L'    },
  { value: 1.5,  label: '1,5 L'  },
  { value: 2,    label: '2 L'    },
  { value: 3,    label: '3 L'    },
];

export function formatQuantity(quantity: number, unit: ProductUnit): string {
  if (unit === 'kg') {
    if (quantity < 1) return `${Math.round(quantity * 1000)}g`;
    return `${quantity} kg`;
  }
  if (unit === 'liter') {
    if (quantity < 1) return `${Math.round(quantity * 1000)} ml`;
    return `${quantity} L`;
  }
  return `${quantity} un`;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly STORAGE_KEY = 'mv_cart';

  private cartSubject = new BehaviorSubject<Cart>(this.loadCart());
  cart$ = this.cartSubject.asObservable();

  private loadCart(): Cart {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : { supermarketId: null, supermarketName: '', items: [] };
    } catch {
      return { supermarketId: null, supermarketName: '', items: [] };
    }
  }

  private save(cart: Cart): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(cart));
    this.cartSubject.next(cart);
  }

  get cart(): Cart {
    return this.cartSubject.value;
  }

  get itemCount(): number {
    return this.cart.items.reduce((acc, i) => acc + i.quantity, 0);
  }

  get subtotal(): number {
    return Math.round(this.cart.items.reduce((acc, i) => acc + i.productPrice * i.quantity, 0) * 100) / 100;
  }

  addItem(
    product: { _id: string; name: string; price: number; image: string; stock: number; unit?: ProductUnit; supermarket: { _id: string; name: string } },
    quantity = 1
  ): string | null {
    const cart = { ...this.cart, items: [...this.cart.items] };
    const smId = product.supermarket._id;
    const unit: ProductUnit = product.unit || 'unit';

    if (cart.supermarketId && cart.supermarketId !== smId) {
      return 'Só podes ter produtos de um supermercado por encomenda. Esvazia o carrinho primeiro.';
    }

    const existing = cart.items.find((i) => i.productId === product._id);
    if (existing) {
      const nextQty = Math.round((existing.quantity + quantity) * 1000) / 1000;
      if (nextQty > product.stock) return 'Stock insuficiente para esta quantidade.';
      existing.quantity = nextQty;
    } else {
      if (quantity > product.stock) return 'Stock insuficiente.';
      cart.items.push({
        productId: product._id,
        productName: product.name,
        productPrice: product.price,
        productImage: product.image,
        quantity,
        stock: product.stock,
        unit
      });
    }

    cart.supermarketId = smId;
    cart.supermarketName = product.supermarket.name;
    this.save(cart);
    return null;
  }

  updateQuantity(productId: string, quantity: number): void {
    const cart = { ...this.cart, items: [...this.cart.items] };
    const item = cart.items.find((i) => i.productId === productId);
    if (!item) return;
    const minQty = item.unit === 'unit' ? 1 : (item.unit === 'kg' ? KG_OPTIONS[0].value : LITER_OPTIONS[0].value);
    item.quantity = Math.min(Math.max(minQty, quantity), item.stock);
    item.quantity = Math.round(item.quantity * 1000) / 1000;
    this.save(cart);
  }

  removeItem(productId: string): void {
    const cart = { ...this.cart };
    cart.items = cart.items.filter((i) => i.productId !== productId);
    if (!cart.items.length) { cart.supermarketId = null; cart.supermarketName = ''; }
    this.save(cart);
  }

  clear(): void {
    const empty: Cart = { supermarketId: null, supermarketName: '', items: [] };
    this.save(empty);
  }
}
