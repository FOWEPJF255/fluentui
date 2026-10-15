import type * as React from 'react';
import type { ComponentProps, ComponentState, EventData, EventHandler, Slot } from '@fluentui/react-utilities';

export type RangeSliderValue = {
  /**
   * The start value: the smaller end of the selected range, whatever the orientation or text direction.
   */
  start: number;

  /**
   * The end value: the larger end of the selected range.
   */
  end: number;
};

export type RangeSliderOnChangeData = (
  | EventData<'change', React.ChangeEvent<HTMLInputElement>>
  | EventData<'pointer', React.PointerEvent<HTMLDivElement>>
) & {
  value: RangeSliderValue;
};

export type RangeSliderSlots = {
  /**
   * The root of the RangeSlider.
   * The root slot receives the `className` and `style` specified directly on the `<RangeSlider>`.
   */
  root: NonNullable<Slot<'div'>>;

  /**
   * The RangeSlider's base. It is used to display the currently selected range.
   */
  rail: NonNullable<Slot<'div'>>;

  /**
   * Visual-only thumb that represents the start value. Focus and interaction come from the nested input.
   */
  startThumb: NonNullable<Slot<'div'>>;

  /**
   * Visual-only thumb that represents the end value. Focus and interaction come from the nested input.
   */
  endThumb: NonNullable<Slot<'div'>>;

  /**
   * Transparent `<input type="range">` layered over the start thumb. It owns the start value for keyboard,
   * assistive technology and forms. Set `disabled` on this slot to disable only the start thumb.
   */
  startInput: NonNullable<Slot<'input'>> & {
    /**
     * Orient is a non standard attribute that allows for vertical orientation in Firefox. It is set internally
     * when `vertical` is set to true.
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range#non_standard_attributes
     * Webkit/Chromium support for vertical inputs is provided via -webkit-appearance css property
     */
    orient?: 'horizontal' | 'vertical';
  };

  /**
   * Transparent `<input type="range">` layered over the end thumb. It owns the end value for keyboard,
   * assistive technology and forms. Set `disabled` on this slot to disable only the end thumb.
   */
  endInput: NonNullable<Slot<'input'>> & {
    /**
     * Orient is a non standard attribute that allows for vertical orientation in Firefox. It is set internally
     * when `vertical` is set to true.
     * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range#non_standard_attributes
     * Webkit/Chromium support for vertical inputs is provided via -webkit-appearance css property
     */
    orient?: 'horizontal' | 'vertical';
  };
};

/**
 * RangeSlider Props.
 *
 * `className`, `style`, `id`, `ref` and event handlers apply to the root group; each input is reachable through
 * its slot's `ref`. Form props (`name`, `form`, `required`) and `aria-describedby`/`aria-invalid` apply to both
 * inputs, so a shared `name` submits both values, start first. `aria-label`/`aria-labelledby` label the group
 * and, unless a slot provides its own label, each input. Props that describe a single thumb, such as a per-thumb
 * label, `aria-valuetext` or `disabled`, go on the `startInput` and `endInput` slots.
 */
export type RangeSliderProps = Omit<
  ComponentProps<Partial<RangeSliderSlots>, 'startInput' | 'endInput'>,
  | 'defaultValue'
  | 'onChange'
  | 'size'
  | 'value'
  | 'aria-valuetext'
  | 'aria-valuenow'
  | 'aria-valuemin'
  | 'aria-valuemax'
> & {
  /**
   * The starting value for an uncontrolled RangeSlider.
   * @default `{ start: min, end: max }`, the full range
   */
  defaultValue?: RangeSliderValue;

  /**
   * Whether the whole RangeSlider is disabled. It takes precedence over `disabled` on the `startInput` and
   * `endInput` slots, which disable a single thumb.
   * @default `false`
   */
  disabled?: boolean;

  /**
   * Maximum slider value.
   * @default 100
   */
  max?: number;

  /**
   * Minimum slider value.
   * @default 0
   */
  min?: number;

  /**
   * Size of the slider.
   * @default 'medium'
   */
  size?: 'small' | 'medium';

  /**
   * Step amount the slider will change by when moved.
   * @default 1
   */
  step?: number;

  /**
   * Controlled value for the RangeSlider. A value with `start` greater than `end` is displayed sorted.
   */
  value?: RangeSliderValue;

  /**
   * Render the RangeSlider vertically with the smallest value at the bottom.
   * @default `false`.
   */
  vertical?: boolean;

  /**
   * Fires when either value changes, with `start` never greater than `end`. `data.type` is `'change'` for
   * keyboard and assistive technology input, and `'pointer'` for pointer and touch input on the rail.
   */
  onChange?: EventHandler<RangeSliderOnChangeData>;
};

export type RangeSliderState = ComponentState<RangeSliderSlots> &
  Pick<RangeSliderProps, 'disabled' | 'size' | 'vertical'> & {
    value: RangeSliderValue;

    /**
     * Whether the start thumb is disabled, by the whole RangeSlider or by its own slot.
     */
    startDisabled: boolean;

    /**
     * Whether the end thumb is disabled, by the whole RangeSlider or by its own slot.
     */
    endDisabled: boolean;

    /**
     * The thumb drawn on top when the thumbs overlap, and moved by a press exactly on them.
     * It is the last thumb interacted with, or the enabled thumb when the other one is disabled.
     * @default 'start'
     */
    activeThumb: 'start' | 'end';
  };

/**
 * RangeSlider base props, excluding design-related props like size.
 * Note: vertical is kept as it affects aria-orientation behavior.
 */
export type RangeSliderBaseProps = Omit<RangeSliderProps, 'size'>;

/**
 * RangeSlider base state, excluding design-related state like size.
 */
export type RangeSliderBaseState = Omit<RangeSliderState, 'size'>;
