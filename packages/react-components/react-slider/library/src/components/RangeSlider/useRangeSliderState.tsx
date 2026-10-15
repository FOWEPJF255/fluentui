'use client';

import * as React from 'react';
import {
  clamp,
  getPercent,
  mergeCallbacks,
  useControllableState,
  useEventCallback,
  useMergedRefs,
} from '@fluentui/react-utilities';
import { useFluent_unstable as useFluent } from '@fluentui/react-shared-contexts';
import { rangeSliderCSSVars } from './RangeSlider.constants';
import type { RangeSliderBaseProps, RangeSliderBaseState, RangeSliderValue } from './RangeSlider.types';

const { rangeSliderDirectionVar, rangeSliderStartProgressVar, rangeSliderEndProgressVar, rangeSliderStepsPercentVar } =
  rangeSliderCSSVars;

type Thumb = 'start' | 'end';

export const useRangeSliderState_unstable = (
  state: RangeSliderBaseState,
  props: RangeSliderBaseProps,
): RangeSliderBaseState => {
  const { min = 0, max = 100, step } = props;
  const { dir } = useFluent();
  const { disabled, vertical } = state;
  const stepValue = step && step > 0 ? step : 1;
  const rangeSpan = max - min;

  // `disabled` on the RangeSlider disables both thumbs and wins over the slots;
  // `disabled` on a single input slot disables only that thumb.
  const startDisabled = !!disabled || !!state.startInput.disabled;
  const endDisabled = !!disabled || !!state.endInput.disabled;

  // Snap value to the nearest step counted from `min` (stepValue defaults to 1)
  const snapToStep = (value: number): number => {
    if (rangeSpan <= 0) {
      return min;
    }
    return clamp(min + Math.round((value - min) / stepValue) * stepValue, min, max);
  };

  const [currentValues, setCurrentValues] = useControllableState<RangeSliderValue>({
    state: props.value,
    defaultState: props.defaultValue,
    initialState: { start: min, end: max },
  });

  // Ensure values are properly ordered and clamped
  const { start: rawStart, end: rawEnd } = currentValues;
  const startValue = clamp(Math.min(rawStart, rawEnd), min, max);
  const endValue = clamp(Math.max(rawStart, rawEnd), min, max);

  // eslint-disable-next-line react-hooks/immutability
  state.value = { start: startValue, end: endValue };

  // Refs for pointer tracking and position calculation
  const activeDragThumb = React.useRef<Thumb | null>(null);
  const [lastUsedThumb, setLastUsedThumb] = React.useState<Thumb>('start');
  const rootRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const startInputRef = React.useRef<HTMLInputElement>(null);
  const endInputRef = React.useRef<HTMLInputElement>(null);

  // When one thumb is disabled, the enabled thumb is the one on top and the one a press moves
  const activeThumb: Thumb =
    startDisabled && !endDisabled ? 'end' : endDisabled && !startDisabled ? 'start' : lastUsedThumb;

  // Shared update function for pointer and input handlers. Skips updates that don't change the value.
  const updateValues = useEventCallback(
    (start: number, end: number, event: React.SyntheticEvent | Event, type: 'change' | 'pointer') => {
      if (start === startValue && end === endValue) {
        return;
      }

      setCurrentValues({ start, end });
      const value = { start, end };

      if (type === 'pointer') {
        props.onChange?.(event, {
          type: 'pointer',
          event: event as React.PointerEvent<HTMLDivElement>,
          value,
        });
      } else {
        props.onChange?.(event, {
          type: 'change',
          event: event as React.ChangeEvent<HTMLInputElement>,
          value,
        });
      }
    },
  );

  // Convert pointer position to slider value using the rail's bounding rect
  // (rail excludes thumb overhang padding, giving accurate 0-100% mapping)
  const getValueFromPointer = (clientX: number, clientY: number): number | null => {
    const rect = railRef.current?.getBoundingClientRect() ?? rootRef.current?.getBoundingClientRect();
    const size = vertical ? rect?.height : rect?.width;
    // A hidden or collapsed rail has no size to map the pointer onto
    if (!rect || !size) {
      return null;
    }

    const offset = vertical ? rect.bottom - clientY : clientX - rect.left;
    const ratio = clamp(offset / size, 0, 1);
    const adjustedRatio = !vertical && dir === 'rtl' ? 1 - ratio : ratio;

    return min + adjustedRatio * rangeSpan;
  };

  // Apply snapped value to the appropriate thumb, stopped at the other thumb
  const applyValueToThumb = (thumb: Thumb, value: number, event: React.SyntheticEvent | Event) => {
    const snapped = snapToStep(value);
    const newStart = thumb === 'start' ? Math.min(snapped, endValue) : startValue;
    const newEnd = thumb === 'end' ? Math.max(snapped, startValue) : endValue;
    updateValues(newStart, newEnd, event, 'pointer');
  };

  // Pick the thumb a pointer press should move, or null when no thumb can move
  const getThumbForValue = (value: number): Thumb | null => {
    if (startDisabled || endDisabled) {
      return startDisabled && endDisabled ? null : activeThumb;
    }
    if (startValue === endValue) {
      // Overlapping thumbs are equally close, so move the one on the side of the press;
      // a press exactly on them keeps the last-used thumb.
      return value < startValue ? 'start' : value > endValue ? 'end' : activeThumb;
    }
    const distStart = Math.abs(value - startValue);
    const distEnd = Math.abs(value - endValue);
    return distStart < distEnd ? 'start' : distEnd < distStart ? 'end' : activeThumb;
  };

  // Pointer handlers for rail click and drag
  const handlePointerDown = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    // Only the primary button (left mouse button, touch contact, pen tip) moves a thumb
    if (disabled || ev.button !== 0) {
      return;
    }

    const value = getValueFromPointer(ev.clientX, ev.clientY);
    if (value === null) {
      return;
    }

    const thumb = getThumbForValue(value);
    if (thumb === null) {
      return;
    }
    activeDragThumb.current = thumb;
    setLastUsedThumb(thumb);

    ev.preventDefault();
    ev.currentTarget.setPointerCapture(ev.pointerId);
    applyValueToThumb(thumb, value, ev);

    // Focus the corresponding input programmatically since pointerEvents: 'none'
    // on the input prevents it from receiving click-focus naturally.
    const inputRef = thumb === 'start' ? startInputRef : endInputRef;
    inputRef.current?.focus();
  });

  const handlePointerMove = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !activeDragThumb.current) {
      return;
    }

    const value = getValueFromPointer(ev.clientX, ev.clientY);
    if (value === null) {
      return;
    }

    ev.preventDefault();
    applyValueToThumb(activeDragThumb.current, value, ev);
  });

  const handlePointerUp = useEventCallback((ev: React.PointerEvent<HTMLDivElement>) => {
    if (ev.currentTarget.hasPointerCapture(ev.pointerId)) {
      ev.currentTarget.releasePointerCapture(ev.pointerId);
    }
    activeDragThumb.current = null;
  });

  // CSS variables for thumb positioning
  const stepPercent = step && step > 0 && rangeSpan ? `${(step * 100) / rangeSpan}%` : undefined;

  // eslint-disable-next-line react-hooks/immutability
  state.root.ref = useMergedRefs(state.root.ref, rootRef);
  // eslint-disable-next-line react-hooks/immutability
  state.rail.ref = useMergedRefs(state.rail.ref, railRef);
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.ref = useMergedRefs(state.startInput.ref, startInputRef);
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.ref = useMergedRefs(state.endInput.ref, endInputRef);
  // eslint-disable-next-line react-hooks/immutability
  state.root.style = {
    [rangeSliderDirectionVar]: vertical ? '0deg' : dir === 'ltr' ? '90deg' : '270deg',
    [rangeSliderStartProgressVar]: `${getPercent(startValue, min, max)}%`,
    [rangeSliderEndProgressVar]: `${getPercent(endValue, min, max)}%`,
    ...(stepPercent && { [rangeSliderStepsPercentVar]: stepPercent }),
    ...state.root.style,
  };

  // eslint-disable-next-line react-hooks/immutability
  state.root.onPointerDown = mergeCallbacks(state.root.onPointerDown, handlePointerDown);
  // eslint-disable-next-line react-hooks/immutability
  state.root.onPointerMove = mergeCallbacks(state.root.onPointerMove, handlePointerMove);
  // eslint-disable-next-line react-hooks/immutability
  state.root.onPointerUp = mergeCallbacks(state.root.onPointerUp, handlePointerUp);
  // eslint-disable-next-line react-hooks/immutability
  state.root.onPointerCancel = mergeCallbacks(state.root.onPointerCancel, handlePointerUp);

  // A thumb disabled on its own uses aria-disabled instead of native `disabled`: it stays focusable, announces its
  // value and is still submitted with a form, but ignores changes. The whole RangeSlider uses native `disabled`.
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.disabled = disabled;
  // eslint-disable-next-line react-hooks/immutability
  state.startInput['aria-disabled'] = !disabled && startDisabled ? true : state.startInput['aria-disabled'];
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.disabled = disabled;
  // eslint-disable-next-line react-hooks/immutability
  state.endInput['aria-disabled'] = !disabled && endDisabled ? true : state.endInput['aria-disabled'];

  // Input configuration for keyboard accessibility.
  // Each input is limited by the other thumb's value. A native range input counts steps from its `min`, so the
  // end input's `min` is aligned down to the step grid to keep keyboard steps in line with pointer snapping;
  // onChange clamps the value back to the start thumb.
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.value = startValue;
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.min = min;
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.max = endValue;
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.step = stepValue;
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.onChange = mergeCallbacks(state.startInput.onChange, ev => {
    if (!startDisabled) {
      updateValues(Math.min(Number(ev.currentTarget.value), endValue), endValue, ev, 'change');
    }
  });
  // eslint-disable-next-line react-hooks/immutability
  state.startInput.onFocus = mergeCallbacks(state.startInput.onFocus, () => {
    setLastUsedThumb('start');
  });

  // eslint-disable-next-line react-hooks/immutability
  state.endInput.value = endValue;
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.min = min + Math.floor((startValue - min) / stepValue) * stepValue;
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.max = max;
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.step = stepValue;
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.onChange = mergeCallbacks(state.endInput.onChange, ev => {
    if (!endDisabled) {
      updateValues(startValue, Math.max(Number(ev.currentTarget.value), startValue), ev, 'change');
    }
  });
  // eslint-disable-next-line react-hooks/immutability
  state.endInput.onFocus = mergeCallbacks(state.endInput.onFocus, () => {
    setLastUsedThumb('end');
  });

  // eslint-disable-next-line react-hooks/immutability
  state.startDisabled = startDisabled;
  // eslint-disable-next-line react-hooks/immutability
  state.endDisabled = endDisabled;
  // eslint-disable-next-line react-hooks/immutability
  state.activeThumb = activeThumb;

  return state;
};
