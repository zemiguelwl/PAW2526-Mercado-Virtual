import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';

import { CatalogRoutingModule } from './catalog-routing.module';
import { CatalogComponent } from './catalog/catalog.component';
import { CompareComponent } from './compare/compare.component';
import { SupermarketListComponent } from './supermarket-list/supermarket-list.component';
import { ReviewsDialogComponent } from './reviews-dialog/reviews-dialog.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';

@NgModule({
  declarations: [CatalogComponent, CompareComponent, SupermarketListComponent, ReviewsDialogComponent, ProductDetailComponent],
  imports: [
    CommonModule,
    FormsModule,
    CatalogRoutingModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDividerModule
  ]
})
export class CatalogModule {}
