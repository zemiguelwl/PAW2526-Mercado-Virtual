import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CatalogService } from '../../../core/services/catalog.service';
import { ReviewsDialogComponent } from '../reviews-dialog/reviews-dialog.component';

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

@Component({
  selector: 'app-supermarket-list',
  standalone: false,
  templateUrl: './supermarket-list.component.html',
  styleUrl: './supermarket-list.component.css'
})
export class SupermarketListComponent implements OnInit {
  supermarkets: any[] = [];
  loading = false;

  constructor(
    private catalogService: CatalogService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.catalogService.getSupermarkets().subscribe({
      next: (res: any) => { this.supermarkets = res.supermarkets; this.loading = false; },
      error: () => (this.loading = false)
    });
  }

  viewProducts(smId: string): void {
    this.router.navigate(['/catalog'], { queryParams: { supermarket: smId } });
  }

  todaySchedule(schedule: any): string {
    if (!schedule) return 'Horário indisponível';
    const key = DAY_KEYS[new Date().getDay()];
    return schedule[key] || 'Fechado';
  }

  openReviews(sm: any): void {
    if (!sm.rating?.count) return;
    this.dialog.open(ReviewsDialogComponent, {
      width: '520px',
      maxHeight: '90vh',
      data: {
        supermarketId: sm._id,
        supermarketName: sm.name,
        ratingAverage: sm.rating.average,
        ratingCount: sm.rating.count
      }
    });
  }
}
