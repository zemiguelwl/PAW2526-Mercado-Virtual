import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { CartService, Cart } from '../../../core/services/cart.service';

@Component({
  selector: 'app-clear-cart-dialog',
  standalone: false,
  template: `
    <h2 mat-dialog-title>Esvaziar carrinho</h2>
    <mat-dialog-content>Tens a certeza que queres remover todos os produtos do carrinho?</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancelar</button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">Esvaziar</button>
    </mat-dialog-actions>
  `
})
export class ClearCartDialogComponent {}

@Component({
  selector: 'app-cart',
  standalone: false,
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit, OnDestroy {
  cart: Cart = { supermarketId: null, supermarketName: '', items: [] };
  private sub!: Subscription;

  constructor(private cartService: CartService, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.sub = this.cartService.cart$.subscribe((c) => (this.cart = c));
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get subtotal(): number {
    return this.cartService.subtotal;
  }

  updateQty(productId: string, qty: number): void {
    this.cartService.updateQuantity(productId, qty);
  }

  remove(productId: string): void {
    this.cartService.removeItem(productId);
  }

  clear(): void {
    this.dialog.open(ClearCartDialogComponent, { width: '360px' })
      .afterClosed()
      .subscribe((confirmed) => { if (confirmed) this.cartService.clear(); });
  }

  checkout(): void {
    this.router.navigate(['/cart/checkout']);
  }
}
