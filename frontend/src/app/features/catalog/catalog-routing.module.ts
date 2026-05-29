import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CatalogComponent } from './catalog/catalog.component';
import { CompareComponent } from './compare/compare.component';
import { SupermarketListComponent } from './supermarket-list/supermarket-list.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';

const routes: Routes = [
  { path: '', component: CatalogComponent },
  { path: 'compare', component: CompareComponent },
  { path: 'supermarkets', component: SupermarketListComponent },
  { path: 'products/:id', component: ProductDetailComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class CatalogRoutingModule {}
