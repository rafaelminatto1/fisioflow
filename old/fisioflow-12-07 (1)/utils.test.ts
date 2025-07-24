
import { pointsToReachLevel, areOnSameDay, isDayBefore } from '/utils.js';

// Mock implementations for a non-Jest environment
const describe = (name: string, fn: () => void) => { 
    // In this mock environment, we execute the test suite immediately.
    // console.log(`DESCRIBE: ${name}`); 
    fn(); 
};
const it = (name: string, fn: () => void) => { 
    // In this mock environment, we execute the test immediately.
    // console.log(`IT: ${name}`);
    try {
        fn();
    } catch (e: any) {
        console.error(`Test failed: ${name}`, e.message);
        throw e;
    }
};
const expect = (value: any) => ({
    toBe: (expected: any) => { if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`); },
});

describe('Gamification Utils', () => {
    describe('pointsToReachLevel', () => {
        it('should return 0 for level 1', () => {
            expect(pointsToReachLevel(1)).toBe(0);
        });

        it('should return 0 for level 0 or less', () => {
            expect(pointsToReachLevel(0)).toBe(0);
            expect(pointsToReachLevel(-5)).toBe(0);
        });

        it('should return 50 for level 2', () => {
            expect(pointsToReachLevel(2)).toBe(50);
        });

        it('should return 200 for level 3', () => {
            expect(pointsToReachLevel(3)).toBe(200);
        });

        it('should calculate points correctly for higher levels', () => {
            // 50 * (5-1)^2 = 50 * 16 = 800
            expect(pointsToReachLevel(5)).toBe(800);
            // 50 * (10-1)^2 = 50 * 81 = 4050
            expect(pointsToReachLevel(10)).toBe(4050);
        });
    });
});

describe('Date Utils', () => {
    describe('areOnSameDay', () => {
        it('should return true for dates on the same day', () => {
            const date1 = new Date('2023-01-01T10:00:00Z');
            const date2 = new Date('2023-01-01T20:00:00Z');
            expect(areOnSameDay(date1, date2)).toBe(true);
        });

        it('should return false for dates on different days', () => {
            const date1 = new Date('2023-01-01T23:59:59Z');
            const date2 = new Date('2023-01-02T00:00:00Z');
            expect(areOnSameDay(date1, date2)).toBe(false);
        });

        it('should return false for dates in different months', () => {
            const date1 = new Date('2023-01-31T12:00:00Z');
            const date2 = new Date('2023-02-01T12:00:00Z');
            expect(areOnSameDay(date1, date2)).toBe(false);
        });

         it('should return false for dates in different years', () => {
            const date1 = new Date('2023-12-31T12:00:00Z');
            const date2 = new Date('2024-01-01T12:00:00Z');
            expect(areOnSameDay(date1, date2)).toBe(false);
        });

        it('should handle timezone differences correctly', () => {
             const date1 = new Date('2023-01-01T23:00:00-03:00'); // Jan 2, 02:00 UTC
             const date2 = new Date('2023-01-02T01:00:00Z'); // Jan 2, 01:00 UTC
             expect(areOnSameDay(date1, date2)).toBe(true);
        });
    });

    describe('isDayBefore', () => {
        it('should return true if the first date is the day before the second', () => {
            const dateToCheck = new Date('2023-01-01T12:00:00Z');
            const referenceDate = new Date('2023-01-02T12:00:00Z');
            expect(isDayBefore(dateToCheck, referenceDate)).toBe(true);
        });

        it('should return false if dates are the same', () => {
            const dateToCheck = new Date('2023-01-01T12:00:00Z');
            const referenceDate = new Date('2023-01-01T18:00:00Z');
            expect(isDayBefore(dateToCheck, referenceDate)).toBe(false);
        });

         it('should return false if the first date is two days before', () => {
            const dateToCheck = new Date('2023-01-01T12:00:00Z');
            const referenceDate = new Date('2023-01-03T12:00:00Z');
            expect(isDayBefore(dateToCheck, referenceDate)).toBe(false);
        });

         it('should handle month changes', () => {
            const dateToCheck = new Date('2023-01-31T12:00:00Z');
            const referenceDate = new Date('2023-02-01T12:00:00Z');
            expect(isDayBefore(dateToCheck, referenceDate)).toBe(true);
        });
        
        it('should handle year changes', () => {
            const dateToCheck = new Date('2023-12-31T12:00:00Z');
            const referenceDate = new Date('2024-01-01T12:00:00Z');
            expect(isDayBefore(dateToCheck, referenceDate)).toBe(true);
        });
    });
});