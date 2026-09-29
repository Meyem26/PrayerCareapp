import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import {
  Dimensions,
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

function animateWithKeyboard(event?: KeyboardEvent) {
  if (Platform.OS !== 'ios' || !event?.duration) return;
  LayoutAnimation.configureNext({
    duration: event.duration,
    update: { duration: event.duration, type: LayoutAnimation.Types.keyboard },
  });
}

/**
 * How many points of `ref`'s view the keyboard (including the iOS QuickType / clipboard bar)
 * covers, measured in window coordinates so it stays correct under headers and inside modals.
 *
 * On Android the window may or may not shrink for the keyboard (edge-to-edge on Android 15+
 * no longer resizes). Pass `onLayout` to the measured view so the overlap is re-measured after
 * any resize — it then settles at 0 when the system already made room, avoiding double spacing.
 */
export function useKeyboardOverlap(ref: RefObject<View | null>): {
  overlap: number;
  onLayout: () => void;
} {
  const [overlap, setOverlap] = useState(0);
  const keyboardTop = useRef<number | null>(null);

  const measure = useCallback(
    (event?: KeyboardEvent) => {
      const top = keyboardTop.current;
      const node = ref.current;
      if (top === null || !node) {
        animateWithKeyboard(event);
        setOverlap(0);
        return;
      }
      node.measureInWindow((_x, y, _width, height) => {
        const next = Math.max(0, Math.round(y + height - top));
        animateWithKeyboard(event);
        setOverlap((current) => (current === next ? current : next));
      });
    },
    [ref],
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;

    function handleShow(event: KeyboardEvent) {
      keyboardTop.current = event.endCoordinates.screenY;
      measure(event);
    }

    function handleHide(event: KeyboardEvent) {
      keyboardTop.current = null;
      animateWithKeyboard(event);
      setOverlap(0);
    }

    const subscriptions =
      Platform.OS === 'ios'
        ? [
            Keyboard.addListener('keyboardWillChangeFrame', (event) => {
              const screenHeight = Dimensions.get('screen').height;
              if (event.endCoordinates.screenY >= screenHeight) {
                handleHide(event);
              } else {
                handleShow(event);
              }
            }),
            Keyboard.addListener('keyboardWillHide', handleHide),
          ]
        : [
            Keyboard.addListener('keyboardDidShow', handleShow),
            Keyboard.addListener('keyboardDidHide', handleHide),
          ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [measure]);

  const onLayout = useCallback(() => {
    if (keyboardTop.current !== null) measure();
  }, [measure]);

  return { overlap, onLayout };
}

/** Full iOS keyboard height, for views pinned to the bottom of a full-screen window (sheets). */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const subscriptions = [
      Keyboard.addListener('keyboardWillShow', (event) => {
        animateWithKeyboard(event);
        setHeight(event.endCoordinates.height);
      }),
      Keyboard.addListener('keyboardWillHide', (event) => {
        animateWithKeyboard(event);
        setHeight(0);
      }),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return height;
}
