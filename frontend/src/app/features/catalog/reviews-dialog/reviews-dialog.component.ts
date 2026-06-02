import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CatalogService } from '../../../core/services/catalog.service';

export interface ReviewsDialogData {
  supermarketId: string;
  supermarketName: string;
  ratingAverage: number;
  ratingCount: number;
}

@Component({
  selector: 'app-reviews-dialog',
  standalone: false,
  templateUrl: './reviews-dialog.component.html',
  styleUrl: './reviews-dialog.component.css'
})
export class ReviewsDialogComponent implements OnInit {
  reviews: any[] = [];
  loading = false;
  stars = [1, 2, 3, 4, 5];

  constructor(
    public dialogRef: MatDialogRef<ReviewsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ReviewsDialogData,
    private catalogService: CatalogService
  ) {}

  ngOnInit(): void {
    this.loading = true;
    this.catalogService.getReviews(this.data.supermarketId).subscribe({
      next: (res: any) => {
        this.reviews = res.reviews;
        this.loading = false;
      },
      error: () => (this.loading = false)
    });
  }

  starsArray(rating: number): boolean[] {
    return this.stars.map((s) => s <= Math.round(rating));
  }

  close(): void {
    this.dialogRef.close();
  }
}
