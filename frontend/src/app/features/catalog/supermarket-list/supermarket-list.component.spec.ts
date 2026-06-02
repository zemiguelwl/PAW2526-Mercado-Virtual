import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupermarketListComponent } from './supermarket-list.component';

describe('SupermarketListComponent', () => {
  let component: SupermarketListComponent;
  let fixture: ComponentFixture<SupermarketListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ declarations: [SupermarketListComponent] }).compileComponents();
    fixture = TestBed.createComponent(SupermarketListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => { expect(component).toBeTruthy(); });
});
