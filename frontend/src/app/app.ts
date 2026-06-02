import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, User } from './core/services/auth.service';
import { CartService } from './core/services/cart.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  currentUser: User | null = null;
  cartCount = 0;
  searchQuery = '';
  private subs: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe(u => (this.currentUser = u)),
      this.cartService.cart$.subscribe(() => (this.cartCount = this.cartService.itemCount))
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  logout(): void {
    this.authService.logout();
  }

  onSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/catalog'], { queryParams: { q: this.searchQuery.trim() } });
    }
  }
}
