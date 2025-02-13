<!--
  Matomo - free/libre analytics platform
  @link https://matomo.org
  @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
-->

<template>
  <div class="multiPairField form-group">
    <div
      v-for="(item, index) in modelValue"
      class="multiPairFieldTable multiple valign-wrapper"
      :class="{ [`multiPairFieldTable${index}`]: true, [`has${fieldCount}Fields`]: true }"
      :key="index"
    >
      <div
        class="fieldUiControl fieldUiControl1"
        v-if="field1"
        :class="{ hasMultiFields: field1.type && field2.type }"
      >
        <Field
          :full-width="true"
          v-model="item[field1.key]"
          :options="field1.availableValues"
          @update:modelValue="onEntryChange(index, field1.key, $event)"
          :placeholder="' '"
          :uicontrol="field1.uiControl"
          :name="`${name}-p1-${index}`"
          :title="field1.title"
        >
        </Field>
      </div>
      <div
        class="fieldUiControl fieldUiControl2"
        v-if="field2"
      >
        <Field
          :full-width="true"
          :options="field2.availableValues"
          @update:modelValue="onEntryChange(index, field2.key, $event)"
          v-model="item[field2.key]"
          :placeholder="' '"
          :uicontrol="field2.uiControl"
          :name="`${name}-p2-${index}`"
          :title="field2.title"
        >
        </Field>
      </div>
      <div
        class="fieldUiControl fieldUiControl3"
        v-if="field3"
      >
        <Field
          :full-width="true"
          :options="field3.availableValues"
          @update:modelValue="onEntryChange(index, field3.key, $event)"
          v-model="item[field3.key]"
          :placeholder="' '"
          :uicontrol="field3.uiControl"
          :title="field3.title"
        >
        </Field>
      </div>
      <div
        class="fieldUiControl fieldUiControl4"
        v-if="field4"
      >
        <Field
          :full-width="true"
          :options="field4.availableValues"
          @update:modelValue="onEntryChange(index, field4.key, $event)"
          v-model="item[field4.key]"
          :placeholder="' '"
          :uicontrol="field4.uiControl"
          :title="field4.title"
        >
        </Field>
      </div>
      <span
        @click="removeEntry(index)"
        class="icon-minus valign"
        v-show="index + 1 !== modelValue.length"
        :title="translate('General_Remove')"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import useExternalPluginComponent from '../useExternalPluginComponent';

// async since this is a a recursive component
const Field = useExternalPluginComponent('CorePluginsAdmin', 'Field');

export default defineComponent({
  props: {
    modelValue: Array,
    name: String,
    field1: Object,
    field2: Object,
    field3: Object,
    field4: Object,
  },
  components: {
    Field,
  },
  computed: {
    fieldCount() {
      if (this.field1 && this.field2 && this.field3 && this.field4) {
        return 4;
      }

      if (this.field1 && this.field2 && this.field3) {
        return 3;
      }

      if (this.field1 && this.field2) {
        return 2;
      }

      if (this.field1) {
        return 1;
      }

      return 0;
    },
  },
  emits: ['update:modelValue'],
  watch: {
    modelValue(newValue) {
      this.checkEmptyModelValue(newValue);
    },
  },
  mounted() {
    this.checkEmptyModelValue(this.modelValue);
  },
  methods: {
    checkEmptyModelValue(newValue) {
      // make sure there is always an empty new value
      if (!newValue || !newValue.length || this.isEmptyValue(newValue.slice(-1)[0])) {
        this.$emit('update:modelValue', [...(newValue || []), this.makeEmptyValue()]);
      }
    },
    onEntryChange(index: number, key: string, newValue: unknown) {
      const newWholeValue = [...this.modelValue];
      newWholeValue[index] = { ...newWholeValue[index], [key]: newValue };
      this.$emit('update:modelValue', newWholeValue);
    },
    removeEntry(index: number) {
      if (index > -1) {
        const newValue = this.modelValue.filter((x, i) => i !== index);
        this.$emit('update:modelValue', newValue);
      }
    },
    isEmptyValue(value: Record<string, unknown>) {
      const { fieldCount } = this;

      if (fieldCount === 4) {
        if (!value[this.field1.key]
          && !value[this.field2.key]
          && !value[this.field3.key]
          && !value[this.field4.key]
        ) {
          return false;
        }
      } else if (fieldCount === 3) {
        if (!value[this.field1.key] && !value[this.field2.key] && !value[this.field3.key]) {
          return false;
        }
      } else if (fieldCount === 2) {
        if (!value[this.field1.key] && !value[this.field2.key]) {
          return false;
        }
      } else if (fieldCount === 1) {
        if (!value[this.field1.key]) {
          return false;
        }
      }

      return true;
    },
    makeEmptyValue(): Record<string, unknown> {
      const result: Record<string, unknown> = {};
      if (this.field1 && this.field1.key) {
        result[this.field1.key] = '';
      }
      if (this.field2 && this.field2.key) {
        result[this.field2.key] = '';
      }
      if (this.field3 && this.field3.key) {
        result[this.field3.key] = '';
      }
      if (this.field4 && this.field4.key) {
        result[this.field4.key] = '';
      }
      return result;
    },
  },
});
</script>
