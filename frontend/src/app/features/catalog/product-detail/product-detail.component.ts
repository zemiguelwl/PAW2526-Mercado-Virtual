import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-product-detail',
  standalone: false,
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: any = null;
  loading = false;
  addedToCart = false;

  private destroy$ = new Subject<void>();

  constructor(
    private catalogService: CatalogService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id) { this.router.navigate(['/catalog']); return; }
      this.loading = true;
      this.catalogService.getProductById(id).subscribe({
        next: (res: any) => { this.product = res.product; this.loading = false; },
        error: () => { this.loading = false; this.router.navigate(['/catalog']); }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  addToCart(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    const error = this.cartService.addItem(this.product);
    if (error) {
      this.snackBar.open(error, 'OK', { duration: 4000 });
    } else {
      this.addedToCart = true;
      this.snackBar.open('Produto adicionado ao carrinho!', '', { duration: 2000 });
      setTimeout(() => (this.addedToCart = false), 2000);
    }
  }

  goBack(): void {
    this.router.navigate(['/catalog']);
  }
}
