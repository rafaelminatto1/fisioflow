

import { useEffect } from 'react';

// This hook applies a mouse-following glow effect to all elements with the 'interactive-card' class.
// It uses a single event listener on the document body for performance.
export const useInteractiveCardEffect = (deps: any[] = []) => {
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const cards = document.getElementsByClassName('interactive-card');
      for (const card of Array.from(cards)) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (card as HTMLElement).style.setProperty('--x', `${x}px`);
        (card as HTMLElement).style.setProperty('--y', `${y}px`);
      }
    };

    // We add the listener to the document body to avoid adding it to every card.
    document.body.addEventListener('mousemove', handleMouseMove);

    // Cleanup function to remove the event listener.
    return () => {
      document.body.removeEventListener('mousemove', handleMouseMove);
    };
    // The dependencies array ensures the effect is re-applied if the view changes,
    // catching any new cards that might have been rendered.
  }, deps);
};