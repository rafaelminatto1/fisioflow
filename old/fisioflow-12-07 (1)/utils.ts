

// Total points needed to reach a certain level
export const pointsToReachLevel = (level: number): number => {
    if (level <= 1) return 0;
    // Exponential growth for level requirements: Lvl 2: 50, Lvl 3: 200, Lvl 4: 450, etc.
    return Math.floor(50 * Math.pow(level - 1, 2)); 
};

export const areOnSameDay = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

export const isDayBefore = (dateToCheck: Date, referenceDate: Date) => {
    const dayBefore = new Date(referenceDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    return areOnSameDay(dateToCheck, dayBefore);
};
