import { Component, input, output } from '@angular/core';
import { CategoryConfig } from '../../algorithms.config';

@Component({
  selector: 'app-category-selector',
  imports: [],
  templateUrl: './category-selector.html',
  styleUrl: './category-selector.scss',
})
export class CategorySelector {
  categories = input.required<CategoryConfig[]>();
  selected = input<CategoryConfig | null>(null);

  categorySelected = output<CategoryConfig>();

  select(category: CategoryConfig): void {
    this.categorySelected.emit(category);
  }
}
