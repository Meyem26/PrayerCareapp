import { useEffect, useState, type RefObject } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  type KeyboardEvent,
  type View,
} from 'react-native';

function animateWithKeyboard(event: KeyboardEvent) {
  if (!event.duration) return;
  LayoutAnimation.configureNext({
    duration: event.duration,
    update: { duration: event.duration, type: LayoutAnimation.Types.keyboard },
  });
}

/**
 * How many points of `ref`'s view the iOS keyboard (including the QuickType / clipboard bar)
 * covers. Measured in window coordinates, so it stays correct under headers and inside
 * page-sheet modals where KeyboardAvoidingView's parent-relative math falls short.
 * Android resizes the window itself, so this is always 0 there.
 */
export function useKeyboardOverlap(ref: RefObject<View | null>): number {
  const [overlap, setOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    function handleFrame(event: KeyboardEvent) {
      const keyboardTop = event.endCoordinates.screenY;
      const node = ref.current;
      if (!node) {
        animateWithKeyboard(event);
        setOverlap(0);
        return;
      }
      node.measureInWindow((_x, y, _width, height) => {
        animateWithKeyboard(event);
        setOverlap(Math.max(0, y + height - keyboardTop));
      });
    }

    function handleHide(event: KeyboardEvent) {
      animateWithKeyboard(event);
      setOverlap(0);
    }

    const subscriptions = [
      Keyboard.addListener('keyboardWillChangeFrame', handleFrame),
      Keyboard.addListener('keyboardWillHide', handleHide),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, [ref]);

  return overlap;
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
