import { useEffect } from 'react';

export const usePreventBodyScroll = (isLocked: boolean) => {
    useEffect(() => {
        if (!isLocked) {
            return;
        }

        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalStyle;
        };
    }, [isLocked]);
};