<!--
  Matomo - free/libre analytics platform
  @link https://matomo.org
  @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
-->

<template>
  <div
    ref="root"
    class="periodSelector piwikSelector"
    v-expand-on-click="{ expander: 'title' }"
  >
    <a
      ref="title"
      id="date"
      class="title"
      tabindex="-1"
      :title="translate('General_ChooseDate', currentlyViewingText)"
    >
      <span class="icon icon-calendar" />
      {{ currentlyViewingText }}
    </a>
    <div
      id="periodMore"
      class="dropdown"
    >
      <div class="flex">
        <div>
          <DateRangePicker
            v-show="selectedPeriod === 'range'"
            class="period-range"
            :start-date="startRangeDate"
            :end-date="endRangeDate"
            @range-change="onRangeChange($event.start, $event.end)"
            @submit="onApplyClicked()"
          >
          </DateRangePicker>
          <div
            class="period-date"
            v-if="selectedPeriod !== 'range'"
          >
            <PeriodDatePicker
              id="datepicker"
              :period="selectedPeriod"
              :date="periodValue === selectedPeriod ? dateValue : null"
              @select="setPiwikPeriodAndDate(selectedPeriod, $event.date)"
            >
            </PeriodDatePicker>
          </div>
        </div>
        <div class="period-type">
          <h6>{{ translate('General_Period') }}</h6>
          <div id="otherPeriods">
            <p
              v-for="period in periodsFiltered"
              :key="period"
            >
              <label
                :class="{ 'selected-period-label': period === selectedPeriod }"
                @dblclick="changeViewedPeriod(period)"
                :title="period === periodValue
                  ? ''
                  : translate('General_DoubleClickToChangePeriod')"
              >
                <input
                  type="radio"
                  name="period"
                  :id="`period_id_${ period }`"
                  v-model="selectedPeriod"
                  :checked="selectedPeriod === period"
                  @change="selectedPeriod = period"
                  @dblclick="changeViewedPeriod(period)"
                />
                <span>{{ getPeriodDisplayText(period) }}</span>
              </label>
            </p>
          </div>
        </div>
      </div>
      <div
        class="compare-checkbox"
        v-if="isComparisonEnabled"
      >
        <label>
          <input
            id="comparePeriodTo"
            type="checkbox"
            v-model="isComparing"
          />
          <span>{{ translate('General_CompareTo') }}</span>
        </label>
        <div id="comparePeriodToDropdown">
          <Field
            v-model="comparePeriodType"
            :style="{'visibility': isComparing ? 'visible' : 'hidden'}"
            :name="'comparePeriodToDropdown'"
            :uicontrol="'select'"
            :options="comparePeriodDropdownOptions"
            :full-width="true"
            :disabled="!isComparing"
          />
        </div>
      </div>
      <div
        class="compare-date-range"
        v-if="isComparing && comparePeriodType === 'custom'"
      >
        <div>
          <div id="comparePeriodStartDate">
            <div>
              <Field
                v-model="compareStartDate"
                :name="'comparePeriodStartDate'"
                :uicontrol="'text'"
                :full-width="true"
                :title="translate('CoreHome_StartDate')"
                :placeholder="'YYYY-MM-DD'"
              />
            </div>
          </div>
          <span class="compare-dates-separator" />
          <div id="comparePeriodEndDate">
            <div>
              <Field
                v-model="compareEndDate"
                :name="'comparePeriodEndDate'"
                :uicontrol="'text'"
                :full-width="true"
                :title="translate('CoreHome_EndDate')"
                :placeholder="'YYYY-MM-DD'"
              />
            </div>
          </div>
        </div>
      </div>
      <div class="apply-button-container">
        <input
          type="submit"
          id="calendarApply"
          class="btn"
          @click="onApplyClicked()"
          :disabled="!isApplyEnabled()"
          :value="translate('General_Apply')"
        />
      </div>
      <div
        id="ajaxLoadingCalendar"
        v-if="isLoadingNewPage"
      >
        <ActivityIndicator
          :loading="true"
        />
        <div class="loadingSegment">
          {{ translate('SegmentEditor_LoadingSegmentedDataMayTakeSomeTime') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue';
import ExpandOnClick from '../ExpandOnClick/ExpandOnClick';
import DateRangePicker from '../DateRangePicker/DateRangePicker.vue';
import PeriodDatePicker from '../PeriodDatePicker/PeriodDatePicker.vue';
import ActivityIndicator from '../ActivityIndicator/ActivityIndicator.vue';
import Matomo from '../Matomo/Matomo';
import translate from '../translate';
import ComparisonsStore from '../Comparisons/Comparisons.store.instance';
import useExternalPluginComponent from '../useExternalPluginComponent';
import {
  Periods,
  parseDate,
  Range,
  format,
} from '../Periods';
import MatomoUrl from '../MatomoUrl/MatomoUrl';

const Field = useExternalPluginComponent('CorePluginsAdmin', 'Field');

const NBSP = Matomo.helper.htmlDecode('&nbsp;');

const COMPARE_PERIOD_OPTIONS = [
  { key: 'custom', value: translate('General_Custom') },
  {
    key: 'previousPeriod',
    value: translate('General_PreviousPeriod').replace(/\s+/, NBSP),
  },
  {
    key: 'previousYear',
    value: translate('General_PreviousYear').replace(/\s+/, NBSP),
  },
];

const piwikMinDate = new Date(Matomo.minDateYear, Matomo.minDateMonth - 1, Matomo.minDateDay);
const piwikMaxDate = new Date(Matomo.maxDateYear, Matomo.maxDateMonth - 1, Matomo.maxDateDay);

function isValidDate(d) {
  if (Object.prototype.toString.call(d) !== '[object Date]') {
    return false;
  }

  return !Number.isNaN(d.getTime());
}

export default defineComponent({
  props: {
    periods: Array,
  },
  components: {
    DateRangePicker,
    PeriodDatePicker,
    Field,
    ActivityIndicator,
  },
  directives: {
    ExpandOnClick,
  },
  data() {
    return {
      comparePeriodDropdownOptions: COMPARE_PERIOD_OPTIONS,
      periodValue: null,
      dateValue: null,
      selectedPeriod: null,
      startRangeDate: null,
      endRangeDate: null,
      isRangeValid: null,
      isLoadingNewPage: false,
      isComparing: null,
      comparePeriodType: 'previousPeriod',
      compareStartDate: '',
      compareEndDate: '',
    };
  },
  mounted() {
    Matomo.on('hidePeriodSelector', () => {
      window.$(this.$refs.root).hide();
    });

    // some widgets might hide the period selector using the event above, so ensure it's
    // shown again when switching the page
    Matomo.on('piwikPageChange', () => {
      window.$(this.$refs.root).show();
    });

    this.updateSelectedValuesFromHash();
    watch(() => MatomoUrl.parsed.value, this.updateSelectedValuesFromHash);

    this.isComparing = ComparisonsStore.isComparingPeriods();
    watch(() => ComparisonsStore.isComparingPeriods(), (newVal) => {
      this.isComparing = newVal;
    });

    window.initTopControls(); // must be called when a top control changes width

    this.handleZIndexPositionRelativeCompareDropdownIssue();
  },
  computed: {
    currentlyViewingText() {
      let date;
      if (this.periodValue === 'range') {
        if (!this.startRangeDate || !this.endRangeDate) {
          return translate('General_Error');
        }

        date = `${this.startRangeDate},${this.endRangeDate}`;
      } else {
        if (!this.dateValue) {
          return translate('General_Error');
        }

        date = format(this.dateValue);
      }

      try {
        return Periods.parse(this.periodValue, date).getPrettyString();
      } catch (e) {
        return translate('General_Error');
      }
    },
    isComparisonEnabled() {
      return ComparisonsStore.isComparisonEnabled();
    },
    periodsFiltered() {
      return (this.periods || []).filter((periodLabel) => Periods.isRecognizedPeriod(periodLabel));
    },
    selectedComparisonParams() {
      if (!this.isComparing) {
        return {};
      }

      if (this.comparePeriodType === 'custom') {
        return {
          comparePeriods: ['range'],
          compareDates: [`${this.compareStartDate},${this.compareEndDate}`],
        };
      }

      if (this.comparePeriodType === 'previousPeriod') {
        return {
          comparePeriods: [this.selectedPeriod],
          compareDates: [this.previousPeriodDateToSelectedPeriod],
        };
      }

      if (this.comparePeriodType === 'previousYear') {
        const dateStr = this.selectedPeriod === 'range'
          ? `${this.startRangeDate},${this.endRangeDate}`
          : this.dateValue;

        const currentDateRange = Periods.parse(this.selectedPeriod, dateStr).getDateRange();
        currentDateRange[0].setFullYear(currentDateRange[0].getFullYear() - 1);
        currentDateRange[1].setFullYear(currentDateRange[1].getFullYear() - 1);

        if (this.selectedPeriod === 'range') {
          return {
            comparePeriods: ['range'],
            compareDates: [`${format(currentDateRange[0])},${format(currentDateRange[1])}`],
          };
        }

        return {
          comparePeriods: [this.selectedPeriod],
          compareDates: [format(currentDateRange[0])],
        };
      }

      console.warn(`Unknown compare period type: ${this.comparePeriodType}`);
      return {};
    },
    previousPeriodDateToSelectedPeriod() {
      if (this.selectedPeriod === 'range') {
        const currentStartRange = parseDate(this.startRangeDate);
        const currentEndRange = parseDate(this.endRangeDate);
        const newEndDate = Range.getLastNRange('day', 2, currentStartRange).startDate;

        const rangeSize = Math.floor((currentEndRange - currentStartRange) / 86400000);
        const newRange = Range.getLastNRange('day', 1 + rangeSize, newEndDate);

        return `${format(newRange.startDate)},${format(newRange.endDate)}`;
      }

      const newStartDate = Range.getLastNRange(this.selectedPeriod, 2, this.dateValue).startDate;
      return format(newStartDate);
    },
    selectedDateString() {
      if (this.selectedPeriod === 'range') {
        const dateFrom = this.startRangeDate;
        const dateTo = this.endRangeDate;
        const oDateFrom = parseDate(dateFrom);
        const oDateTo = parseDate(dateTo);

        if (!isValidDate(oDateFrom)
          || !isValidDate(oDateTo)
          || oDateFrom > oDateTo
        ) {
          // TODO: use a notification instead?
          window.$('#alert')
            .find('h2')
            .text(translate('General_InvalidDateRange'));
          Matomo.helper.modalConfirm('#alert', {});
          return null;
        }

        return `${dateFrom},${dateTo}`;
      }

      return format(this.dateValue);
    },
  },
  methods: {
    handleZIndexPositionRelativeCompareDropdownIssue() {
      const $element = window.$(this.$refs.root);
      $element.on('focus', '#comparePeriodToDropdown .select-dropdown', () => {
        $element.addClass('compare-dropdown-open');
      }).on('blur', '#comparePeriodToDropdown .select-dropdown', () => {
        $element.removeClass('compare-dropdown-open');
      });
    },
    changeViewedPeriod() {
      // only change period if it's different from what's being shown currently
      if (this.period === this.periodValue) {
        return;
      }

      // can't just change to a range period, w/o setting two new dates
      if (this.period === 'range') {
        return;
      }

      this.setPiwikPeriodAndDate(this.period, this.dateValue);
    },
    setPiwikPeriodAndDate(period: string, date: Date) {
      this.periodValue = period;
      this.selectedPeriod = period;
      this.dateValue = date;

      const currentDateString = format(date);
      this.setRangeStartEndFromPeriod(period, currentDateString);

      this.propagateNewUrlParams(currentDateString, this.selectedPeriod);

      window.initTopControls();
    },
    propagateNewUrlParams(date: string, period: string) {
      const compareParams = this.selectedComparisonParams;

      let baseParams: Record<string, unknown>;
      if (Matomo.helper.isAngularRenderingThePage()) {
        this.closePeriodSelector();
        baseParams = MatomoUrl.hashParsed.value;
      } else {
        this.isLoadingNewPage = true;
        baseParams = MatomoUrl.parsed.value;
      }

      // get params without comparePeriods/compareSegments/compareDates
      const paramsWithoutCompare = { ...baseParams };
      delete paramsWithoutCompare.comparePeriods;
      delete paramsWithoutCompare.compareDates;

      MatomoUrl.updateLocation({
        ...paramsWithoutCompare,
        date,
        period,
        ...compareParams,
      });
    },
    onApplyClicked() {
      if (this.selectedPeriod === 'range') {
        const dateString = this.selectedDateString;
        if (!dateString) {
          return;
        }

        this.periodValue = 'range';

        this.propagateNewUrlParams(dateString, 'range');
        return;
      }

      this.setPiwikPeriodAndDate(this.selectedPeriod, this.dateValue);
    },
    updateSelectedValuesFromHash() {
      const { date, period } = MatomoUrl.parsed.value;

      this.periodValue = period;
      this.selectedPeriod = period;

      this.dateValue = null;
      this.startRangeDate = null;
      this.endRangeDate = null;

      try {
        Periods.parse(period, date);
      } catch (e) {
        return;
      }

      if (period === 'range') {
        const periodObj = Periods.get(period).parse(date) as Range;

        const [startDate, endDate] = periodObj.getDateRange();
        this.dateValue = startDate;
        this.startRangeDate = format(startDate);
        this.endRangeDate = format(endDate);
      } else {
        this.dateValue = parseDate(date);
        this.setRangeStartEndFromPeriod(period, date);
      }
    },
    setRangeStartEndFromPeriod(period: string, dateStr: string) {
      const dateRange = Periods.parse(period, dateStr).getDateRange();
      this.startRangeDate = format(dateRange[0] < piwikMinDate ? piwikMinDate : dateRange[0]);
      this.endRangeDate = format(dateRange[1] > piwikMaxDate ? piwikMaxDate : dateRange[1]);
    },
    getPeriodDisplayText(periodLabel: string) {
      return Periods.get(periodLabel).getDisplayText();
    },
    onRangeChange(start: Date, end: Date) {
      if (!start || !end) {
        this.isRangeValid = false;
        return;
      }

      this.isRangeValid = true;
      this.startRangeDate = start;
      this.endRangeDate = end;
    },
    isApplyEnabled() {
      if (this.selectedPeriod === 'range'
        && !this.isRangeValid
      ) {
        return false;
      }

      if (this.isComparing
        && this.comparePeriodType === 'custom'
        && !this.isCompareRangeValid()
      ) {
        return false;
      }

      return true;
    },
    closePeriodSelector() {
      this.$refs.root.classList.remove('expanded');
    },
    isCompareRangeValid() {
      try {
        parseDate(this.compareStartDate);
      } catch (e) {
        return false;
      }

      try {
        parseDate(this.compareEndDate);
      } catch (e) {
        return false;
      }

      return true;
    },
  },
});
</script>
