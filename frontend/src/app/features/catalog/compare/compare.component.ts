import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-compare',
  standalone: false,
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.css'
})
export class CompareComponent implements OnInit {
  searchName = '';
  searchInput = '';
  results: any[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private catalogService: CatalogService,
    private cartService: CartService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const name = params['name'] || '';
      if (name) {
        this.searchInput = name;
        this.doSearch(name);
      }
    });
  }

  onSearch(): void {
    if (!this.searchInput.trim()) return;
    this.router.navigate([], { queryParams: { name: this.searchInput.trim() }, queryParamsHandling: 'merge' });
    this.doSearch(this.searchInput.trim());
  }

  private doSearch(name: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.searchName = name;
    this.catalogService.compareProducts(name).subscribe({
      next: (res: any) => {
        this.results = res.results;
        this.loading = false;
        if (!this.results.length) this.errorMessage = `Nenhum resultado para "${name}".`;
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erro ao pesquisar.';
      }
    });
  }

  addToCart(product: any): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/catalog/compare' } });
      return;
    }
    const error = this.cartService.addItem(product);
    if (error) {
      this.snackBar.open(error, 'OK', { duration: 4000 });
    } else {
      this.snackBar.open('Produto adicionado ao carrinho!', '', { duration: 2000 });
    }
  }
}
