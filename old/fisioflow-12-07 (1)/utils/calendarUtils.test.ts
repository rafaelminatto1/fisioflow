
import { processAppointmentsForLayout } from '/utils/calendarUtils.js';
import { Appointment, AppointmentType } from '/types.js';

// Mock implementations for a non-Jest environment
const describe = (name: string, fn: () => void) => { 
    try {
        fn(); 
        // console.log(`✅ DESCRIBE: ${name} PASSED`);
    } catch (e) {
        console.error(`❌ DESCRIBE: ${name} FAILED`, e);
    }
};
const it = (name: string, fn: () => void) => { 
    try {
        fn();
        // console.log(`  - ✅ IT: ${name} PASSED`);
    } catch(e) {
        console.error(`  - ❌ IT: ${name} FAILED`, e);
        throw e;
    }
};
const expect = (value: any) => ({
    toBe: (expected: any) => { if (value !== expected) throw new Error(`Expected ${value} to be ${expected}`); },
    toEqual: (expected: any) => { if (JSON.stringify(value) !== JSON.stringify(expected)) throw new Error(`Expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`); },
    toHaveLength: (expected: number) => { if (value.length !== expected) throw new Error(`Expected length ${expected}, but got ${value.length}`); },
});

const createAppointment = (id: string, startHour: number, startMinute: number, endHour: number, endMinute: number): Appointment => ({
    id,
    title: `Appt ${id}`,
    patientId: 'p1',
    therapistId: 't1',
    start: new Date(2024, 1, 1, startHour, startMinute).toISOString(),
    end: new Date(2024, 1, 1, endHour, endMinute).toISOString(),
    status: 'agendado',
    type: AppointmentType.SESSAO
});

describe('processAppointmentsForLayout', () => {
    const gridStartHour = 8;
    const gridEndHour = 18;

    it('should return an empty array for no appointments', () => {
        const result = processAppointmentsForLayout([], gridStartHour, gridEndHour);
        expect(result).toEqual([]);
    });

    it('should process a single appointment correctly', () => {
        const appts = [createAppointment('1', 9, 0, 10, 0)];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        expect(result).toHaveLength(1);
        expect(result[0].columns).toBe(1);
        expect(result[0].leftIndex).toBe(0);
        expect(result[0].width).toBe(100);
        expect(result[0].left).toBe(0);
    });

    it('should process two non-overlapping appointments', () => {
        const appts = [
            createAppointment('1', 9, 0, 10, 0),
            createAppointment('2', 10, 0, 11, 0),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        expect(result).toHaveLength(2);
        expect(result[0].columns).toBe(1);
        expect(result[1].columns).toBe(1);
    });

    it('should process two fully overlapping appointments', () => {
        const appts = [
            createAppointment('1', 9, 0, 10, 0),
            createAppointment('2', 9, 0, 10, 0),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        expect(result).toHaveLength(2);
        expect(result[0].columns).toBe(2);
        expect(result[0].leftIndex).toBe(0);
        expect(result[0].width).toBe(50);
        expect(result[0].left).toBe(0);

        expect(result[1].columns).toBe(2);
        expect(result[1].leftIndex).toBe(1);
        expect(result[1].width).toBe(50);
        expect(result[1].left).toBe(50);
    });

    it('should process two partially overlapping appointments', () => {
        const appts = [
            createAppointment('1', 9, 0, 10, 0),
            createAppointment('2', 9, 30, 10, 30),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        expect(result).toHaveLength(2);
        expect(result[0].columns).toBe(2);
        expect(result[1].columns).toBe(2);
        expect(result[0].width).toBe(50);
        expect(result[1].width).toBe(50);
    });

    it('should handle a chain of three overlapping appointments', () => {
        const appts = [
            createAppointment('1', 9, 0, 10, 0),
            createAppointment('2', 9, 30, 10, 30),
            createAppointment('3', 10, 0, 11, 0),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        const appt1 = result.find(a => a.id === '1');
        const appt2 = result.find(a => a.id === '2');
        const appt3 = result.find(a => a.id === '3');
        
        expect(appt1?.columns).toBe(2);
        expect(appt1?.width).toBe(50);
        
        expect(appt2?.columns).toBe(2);
        expect(appt2?.width).toBe(50);
        
        expect(appt3?.columns).toBe(2);
        expect(appt3?.width).toBe(50);
        expect(appt3?.leftIndex).toBe(0); // Should re-use the first column
    });
    
    it('should handle three fully overlapping appointments', () => {
         const appts = [
            createAppointment('1', 9, 0, 10, 0),
            createAppointment('2', 9, 0, 10, 0),
            createAppointment('3', 9, 0, 10, 0),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        expect(result.every(a => a.columns === 3)).toBe(true);
        expect(result[0].width).toBe(100/3);
        expect(result[1].width).toBe(100/3);
        expect(result[2].width).toBe(100/3);
        
        expect(result[0].leftIndex).toBe(0);
        expect(result[1].leftIndex).toBe(1);
        expect(result[2].leftIndex).toBe(2);
    });

    it('should handle complex interleaving appointments', () => {
        const appts = [
            createAppointment('A', 9, 0, 10, 0),
            createAppointment('B', 11, 0, 12, 0),
            createAppointment('C', 9, 30, 11, 30),
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        const apptA = result.find(a => a.id === 'A');
        const apptB = result.find(a => a.id === 'B');
        const apptC = result.find(a => a.id === 'C');

        // A and C overlap. B and C overlap. A and B do not.
        // This should result in 2 columns. A and B can share a column.
        expect(apptA?.columns).toBe(2);
        expect(apptB?.columns).toBe(2);
        expect(apptC?.columns).toBe(2);

        expect(apptA?.leftIndex).toBe(0);
        expect(apptC?.leftIndex).toBe(1);
        expect(apptB?.leftIndex).toBe(0); // B re-uses A's column
    });
    
    it('should correctly handle a large number of overlapping appointments', () => {
        const appts = [
            createAppointment('A', 9, 0, 10, 0), // Col 0
            createAppointment('B', 9, 15, 10, 15), // Col 1
            createAppointment('C', 9, 30, 10, 30), // Col 2
            createAppointment('D', 10, 0, 11, 0), // Col 0 (reuses A's slot)
            createAppointment('E', 10, 15, 11, 15), // Col 1 (reuses B's slot)
            createAppointment('F', 9, 0, 11, 0), // Col 3 (overlaps A,B,C,D,E)
        ];
        const result = processAppointmentsForLayout(appts, gridStartHour, gridEndHour);
        
        const getById = (id: string) => result.find(a => a.id === id);

        // All appointments from 9:00 to 11:00 are part of the same overlapping group
        // F overlaps with everything, creating the maximum number of columns needed.
        // A, B, C can fit in 3 columns. D can reuse A's. E can reuse B's. F needs a new one.
        // A(0), B(1), C(2)
        // F needs col 3.
        // D reuses col 0. E reuses col 1.
        expect(getById('A')?.columns).toBe(4);
        expect(getById('B')?.columns).toBe(4);
        expect(getById('C')?.columns).toBe(4);
        expect(getById('D')?.columns).toBe(4);
        expect(getById('E')?.columns).toBe(4);
        expect(getById('F')?.columns).toBe(4);

        expect(getById('A')?.leftIndex).toBe(0);
        expect(getById('B')?.leftIndex).toBe(1);
        expect(getById('C')?.leftIndex).toBe(2);
        expect(getById('F')?.leftIndex).toBe(3);
        expect(getById('D')?.leftIndex).toBe(0);
        expect(getById('E')?.leftIndex).toBe(1);
    });
});