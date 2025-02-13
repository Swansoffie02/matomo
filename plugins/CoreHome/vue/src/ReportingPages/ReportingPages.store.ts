/*!
 * Matomo - free/libre analytics platform
 *
 * @link https://matomo.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

import { reactive, computed, readonly } from 'vue';
import AjaxHelper from '../AjaxHelper/AjaxHelper';
import { Widget } from '../Widget/Widgets.store';

interface CategoryRef {
  id: string;
  name: string;
}

interface SubcategoryRef {
  id: string;
  name: string;
}

export interface Page {
  category: CategoryRef;
  subcategory: SubcategoryRef;
  widgets: Widget[];
}

interface ReportingPagesStoreState {
  pages: Page[];
}

export class ReportingPagesStore {
  private privateState = reactive<ReportingPagesStoreState>({
    pages: [],
  });

  private state = readonly(this.privateState);

  private fetchAllPagesPromise?: Promise<Page[]>;

  readonly pages = computed(() => this.state.pages);

  findPageInCategory(categoryId: string): Page {
    // happens when user switches between sites, in this case check if the same category exists and
    // if so, select first entry from that category
    return this.pages.value.find((p) => p
      && p.category && p.category.id === categoryId && p.subcategory && p.subcategory.id);
  }

  findPage(categoryId: string, subcategoryId: string): Page {
    return this.pages.value.find((p) => p
      && p.category && p.subcategory && p.category.id === categoryId
      && `${p.subcategory.id}` === subcategoryId);
  }

  reloadAllPages(): Promise<typeof ReportingPagesStore['pages']['value']> {
    this.fetchAllPagesPromise = null;
    return this.getAllPages();
  }

  getAllPages(): Promise<typeof ReportingPagesStore['pages']['value']> {
    if (!this.fetchAllPagesPromise) {
      this.fetchAllPagesPromise = AjaxHelper.fetch({
        method: 'API.getReportPagesMetadata',
        filter_limit: '-1',
      }).then((response) => {
        this.privateState.pages = response;
      });
    }

    return this.fetchAllPagesPromise.then(() => this.pages.value);
  }
}

export default new ReportingPagesStore();
