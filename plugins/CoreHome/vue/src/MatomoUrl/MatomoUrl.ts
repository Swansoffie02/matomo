/*!
 * Matomo - free/libre analytics platform
 *
 * @link https://matomo.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

import { ILocationService, ITimeoutService } from 'angular';
import { computed, ref, readonly } from 'vue';
import Matomo from '../Matomo/Matomo';
import { Periods, format } from '../Periods'; // important to load all periods here

const { piwik, broadcast } = window;

function isValidPeriod(periodStr: string, dateStr: string) {
  try {
    Periods.parse(periodStr, dateStr);
    return true;
  } catch (e) {
    return false;
  }
}

// using unknown since readonly does not work well with recursive types like QueryParameters
type ParsedQueryParameters = Record<string, unknown>;

/**
 * URL store and helper functions.
 */
class MatomoUrl {
  private urlQuery = ref('');

  private hashQuery = ref('');

  readonly urlParsed = computed(() => readonly(
    broadcast.getValuesFromUrl(`?${this.urlQuery.value}`, true) as ParsedQueryParameters,
  ));

  readonly hashParsed = computed(() => readonly(
    broadcast.getValuesFromUrl(`?${this.hashQuery.value}`, true) as ParsedQueryParameters,
  ));

  readonly parsed = computed(() => readonly({
    ...this.urlParsed.value,
    ...this.hashParsed.value,
  } as ParsedQueryParameters));

  constructor() {
    this.setUrlQuery(window.location.search);
    this.setHashQuery(window.location.hash);

    // $locationChangeSuccess is triggered before angularjs changes actual window the hash, so we
    // have to hook into this method if we want our event handlers to execute before other angularjs
    // handlers (like the reporting page one)
    Matomo.on('$locationChangeSuccess', (absUrl: string) => {
      const url = new URL(absUrl);
      this.setUrlQuery(url.search.replace(/^\?/, ''));
      this.setHashQuery(url.hash.replace(/^#/, ''));
    });

    this.updatePeriodParamsFromUrl();
  }

  updateHash(params: QueryParameters|string) {
    const modifiedParams = this.getFinalHashParams(params);
    const serializedParams = this.stringify(modifiedParams);

    const $location: ILocationService = Matomo.helper.getAngularDependency('$location');
    $location.search(serializedParams);

    const $timeout: ITimeoutService = Matomo.helper.getAngularDependency('$timeout');
    $timeout();
  }

  updateUrl(params: QueryParameters|string, hashParams: QueryParameters|string = {}) {
    const serializedParams: string = typeof params !== 'string' ? this.stringify(params) : params;

    const modifiedHashParams = this.getFinalHashParams(hashParams);
    const serializedHashParams: string = this.stringify(modifiedHashParams);

    let url = `?${serializedParams}`;
    if (serializedHashParams.length) {
      url = `${url}#?${serializedHashParams}`;
    }

    window.broadcast.propagateNewPage('', undefined, undefined, undefined, url);
  }

  private getFinalHashParams(params: QueryParameters|string) {
    return {
      // these params must always be present in the hash
      period: this.parsed.value.period,
      date: this.parsed.value.date,
      segment: this.parsed.value.segment,

      ...(typeof params !== 'string' ? params : broadcast.getValuesFromUrl(`?${params}`, true)),
    };
  }

  // if we're in an embedded context, loads an entire new URL, otherwise updates the hash
  updateLocation(params: QueryParameters|string) {
    if (Matomo.helper.isAngularRenderingThePage()) {
      this.updateHash(params);
      return;
    }

    this.updateUrl(params);
  }

  getSearchParam(paramName: string): string {
    const hash = window.location.href.split('#');

    const regex = new RegExp(`${paramName}(\\[]|=)`);
    if (hash && hash[1] && regex.test(decodeURIComponent(hash[1]))) {
      const valueFromHash = window.broadcast.getValueFromHash(paramName, window.location.href);

      // for date, period and idsite fall back to parameter from url, if non in hash was provided
      if (valueFromHash
        || (paramName !== 'date' && paramName !== 'period' && paramName !== 'idSite')
      ) {
        return valueFromHash;
      }
    }

    return window.broadcast.getValueFromUrl(paramName, window.location.search);
  }

  stringify(search: QueryParameters): string {
    const searchWithoutEmpty = Object.fromEntries(
      Object.entries(search).filter(([, value]) => value !== '' && value !== null && value !== undefined),
    );

    // TODO: using $ since URLSearchParams does not handle array params the way Matomo uses them
    return $.param(searchWithoutEmpty).replace(/%5B%5D/g, '[]')
      // some browsers treat URLs w/ date=a,b differently from date=a%2Cb, causing multiple
      // entries to show up in the browser history. this has a compounding effect w/ angular.js,
      // which when the back button is pressed to effectively abort the back navigation.
      .replace(/%2C/g, ',');
  }

  updatePeriodParamsFromUrl(): void {
    let date = this.getSearchParam('date');
    const period = this.getSearchParam('period');
    if (!isValidPeriod(period, date)) {
      // invalid data in URL
      return;
    }

    if (piwik.period === period && piwik.currentDateString === date) {
      // this period / date is already loaded
      return;
    }

    piwik.period = period;

    const dateRange = Periods.parse(period, date).getDateRange();
    piwik.startDateString = format(dateRange[0]);
    piwik.endDateString = format(dateRange[1]);

    piwik.updateDateInTitle(date, period);

    // do not set anything to previousN/lastN, as it's more useful to plugins
    // to have the dates than previousN/lastN.
    if (piwik.period === 'range') {
      date = `${piwik.startDateString},${piwik.endDateString}`;
    }

    piwik.currentDateString = date;
  }

  private setUrlQuery(search: string) {
    this.urlQuery.value = search.replace(/^\?/, '');
  }

  private setHashQuery(hash: string) {
    this.hashQuery.value = hash.replace(/^[#/?]+/, '');
  }
}

const instance = new MatomoUrl();
export default instance;

piwik.updatePeriodParamsFromUrl = instance.updatePeriodParamsFromUrl.bind(instance);
