import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

const PHONE_REGEX = /^[239]\d{8}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  form = { name: '', email: '', password: '', phone: '', address: '', role: 'client' };
  errorMessage = '';
  loading = false;

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    const { name, email, password, phone } = this.form;
    if (!name || !email || !password || !phone) {
      this.errorMessage = 'Preenche todos os campos obrigatórios.';
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      this.errorMessage = 'Introduz um endereço de email válido (ex: nome@dominio.com).';
      return;
    }
    if (!PHONE_REGEX.test(phone.trim())) {
      this.errorMessage = 'Número de telemóvel inválido. Deve ter 9 dígitos e começar por 2, 3 ou 9 (ex: 912345678).';
      return;
    }
    if (password.length < 6) {
      this.errorMessage = 'A password deve ter pelo menos 6 caracteres.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.register(this.form).subscribe({
      next: (res: any) => {
        this.router.navigate(['/auth/verify-email'], { queryParams: { userId: res.userId } });
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'Erro ao criar conta.';
      }
    });
  }
}
