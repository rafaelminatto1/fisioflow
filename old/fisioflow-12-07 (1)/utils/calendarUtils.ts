import { Appointment } from '../types';

export interface LaidOutAppointment extends Appointment {
    startMinutes: number;
    endMinutes: number;
    columns: number;
    leftIndex: number;
    top: number;
    height: number;
    width: number;
    left: number;
}

export const processAppointmentsForLayout = (
    dailyAppointments: Appointment[],
    gridStartHour: number,
    gridEndHour: number
): LaidOutAppointment[] => {
    if (!dailyAppointments || dailyAppointments.length === 0) {
        return [];
    }
    
    const layoutEvents = dailyAppointments.map(event => ({
        ...event,
        startMinutes: new Date(event.start).getHours() * 60 + new Date(event.start).getMinutes(),
        endMinutes: new Date(event.end).getHours() * 60 + new Date(event.end).getMinutes(),
        columns: 1,
        leftIndex: 0,
    })).sort((a, b) => a.startMinutes - b.startMinutes || a.endMinutes - b.endMinutes);

    for (let i = 0; i < layoutEvents.length; i++) {
        const currentEvent = layoutEvents[i];
        const concurrent: typeof currentEvent[] = [currentEvent];
        
        for (let j = i + 1; j < layoutEvents.length; j++) {
            const otherEvent = layoutEvents[j];
            if (currentEvent.endMinutes > otherEvent.startMinutes) {
                concurrent.push(otherEvent);
            }
        }
        
        const columnAssignments: (typeof currentEvent | null)[] = [];
        for(const event of concurrent) {
            let placed = false;
            for(let col = 0; col < columnAssignments.length; col++){
                if(!columnAssignments[col] || (columnAssignments[col] as typeof currentEvent).endMinutes <= event.startMinutes){
                    columnAssignments[col] = event;
                    event.leftIndex = col;
                    placed = true;
                    break;
                }
            }
            if(!placed){
                columnAssignments.push(event);
                event.leftIndex = columnAssignments.length - 1;
            }
        }
        
        for (const event of concurrent) {
             event.columns = columnAssignments.length;
        }
    }
    
    return layoutEvents.map(event => ({
        ...event,
        top: ((event.startMinutes - gridStartHour * 60) / ((gridEndHour - gridStartHour) * 60)) * 100,
        height: ((event.endMinutes - event.startMinutes) / ((gridEndHour - gridStartHour) * 60)) * 100,
        width: 100 / event.columns,
        left: (100 / event.columns) * event.leftIndex,
    }));
};
