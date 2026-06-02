import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: false,
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.css'
})
export class VerifyEmailComponent implements OnInit {
  code = '';
  userId = '';
  errorMessage = '';
  successMessage = '';
  resendMessage = '';
  loading = false;
  resending = false;
  verified = false;
  fromLogin = false;    // true quando o utilizador chegou aqui via tentativa de login

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.queryParams['userId'] || '';
    this.fromLogin = this.route.snapshot.queryParams['from'] === 'login';
    if (!this.userId) this.router.navigate(['/auth/register']);
  }

  onSubmit(): void {
    if (!this.code.trim()) {
      this.errorMessage = 'Introduz o código de verificação.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    this.resendMessage = '';

    this.authService.verifyEmail(this.userId, this.code.trim()).subscribe({
      next: () => {
        this.verified = true;
        this.successMessage = 'Email verificado com sucesso! A redirecionar para o login...';
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Código inválido.';
      }
    });
  }

  resend(): void {
    this.resending = true;
    this.errorMessage = '';
    this.resendMessage = '';
    this.authService.resendVerification(this.userId).subscribe({
      next: () => {
        this.resending = false;
        this.code = '';
        this.resendMessage = 'Novo código enviado para o teu email. Introduz-o abaixo.';
      },
      error: (err) => {
        this.resending = false;
        this.errorMessage = err.error?.message || 'Erro ao reenviar.';
      }
    });
  }
}
