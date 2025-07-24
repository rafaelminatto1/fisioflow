import * as SQLite from 'expo-sqlite';
import { Patient, Appointment } from '../types';

// Initialize database
const db = SQLite.openDatabase('fisioflow.db');

// Initialize tables
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Create patients table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            cpf TEXT NOT NULL,
            birthDate TEXT NOT NULL,
            street TEXT NOT NULL,
            number TEXT NOT NULL,
            complement TEXT,
            district TEXT NOT NULL,
            city TEXT NOT NULL,
            state TEXT NOT NULL,
            zipCode TEXT NOT NULL,
            emergencyContactName TEXT NOT NULL,
            emergencyContactPhone TEXT NOT NULL,
            emergencyContactRelationship TEXT NOT NULL,
            conditions TEXT NOT NULL,
            medications TEXT NOT NULL,
            allergies TEXT NOT NULL,
            surgeries TEXT NOT NULL,
            familyHistory TEXT,
            sessions INTEGER DEFAULT 0,
            progress INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            tenantId TEXT NOT NULL,
            assignedPhysiotherapist TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          );
        `);

        // Create appointments table
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patientId TEXT NOT NULL,
            physiotherapistId TEXT NOT NULL,
            startTime TEXT NOT NULL,
            endTime TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT DEFAULT 'scheduled',
            notes TEXT,
            tenantId TEXT NOT NULL,
            createdAt TEXT NOT NULL,
            FOREIGN KEY (patientId) REFERENCES patients (id)
          );
        `);
      },
      (error) => {
        console.error('Error initializing database:', error);
        reject(error);
      },
      () => {
        console.log('Database initialized successfully');
        resolve();
      }
    );
  });
};

// Patient CRUD operations
export const createPatient = (patient: Patient): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `INSERT INTO patients (
            id, name, email, phone, cpf, birthDate,
            street, number, complement, district, city, state, zipCode,
            emergencyContactName, emergencyContactPhone, emergencyContactRelationship,
            conditions, medications, allergies, surgeries, familyHistory,
            sessions, progress, status, tenantId, assignedPhysiotherapist,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            patient.id,
            patient.name,
            patient.email,
            patient.phone,
            patient.cpf,
            patient.birthDate,
            patient.address.street,
            patient.address.number,
            patient.address.complement || '',
            patient.address.district,
            patient.address.city,
            patient.address.state,
            patient.address.zipCode,
            patient.emergencyContact.name,
            patient.emergencyContact.phone,
            patient.emergencyContact.relationship,
            JSON.stringify(patient.medicalInfo.conditions),
            JSON.stringify(patient.medicalInfo.medications),
            JSON.stringify(patient.medicalInfo.allergies),
            JSON.stringify(patient.medicalInfo.surgeries),
            patient.medicalInfo.familyHistory || '',
            patient.sessions,
            patient.progress,
            patient.status,
            patient.tenantId,
            patient.assignedPhysiotherapist,
            patient.createdAt,
            patient.updatedAt,
          ]
        );
      },
      (error) => {
        console.error('Error creating patient:', error);
        reject(error);
      },
      () => {
        console.log('Patient created successfully');
        resolve();
      }
    );
  });
};

export const getAllPatients = (): Promise<Patient[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM patients ORDER BY name',
        [],
        (_, { rows }) => {
          const patients: Patient[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            patients.push({
              id: row.id,
              name: row.name,
              email: row.email,
              phone: row.phone,
              cpf: row.cpf,
              birthDate: row.birthDate,
              address: {
                street: row.street,
                number: row.number,
                complement: row.complement,
                district: row.district,
                city: row.city,
                state: row.state,
                zipCode: row.zipCode,
              },
              emergencyContact: {
                name: row.emergencyContactName,
                phone: row.emergencyContactPhone,
                relationship: row.emergencyContactRelationship,
              },
              medicalInfo: {
                conditions: JSON.parse(row.conditions),
                medications: JSON.parse(row.medications),
                allergies: JSON.parse(row.allergies),
                surgeries: JSON.parse(row.surgeries),
                familyHistory: row.familyHistory,
              },
              sessions: row.sessions,
              progress: row.progress,
              status: row.status,
              tenantId: row.tenantId,
              assignedPhysiotherapist: row.assignedPhysiotherapist,
              createdAt: row.createdAt,
              updatedAt: row.updatedAt,
            });
          }
          resolve(patients);
        },
        (_, error) => {
          console.error('Error fetching patients:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const updatePatient = (patient: Patient): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE patients SET
            name = ?, email = ?, phone = ?, cpf = ?, birthDate = ?,
            street = ?, number = ?, complement = ?, district = ?, city = ?, state = ?, zipCode = ?,
            emergencyContactName = ?, emergencyContactPhone = ?, emergencyContactRelationship = ?,
            conditions = ?, medications = ?, allergies = ?, surgeries = ?, familyHistory = ?,
            sessions = ?, progress = ?, status = ?, assignedPhysiotherapist = ?, updatedAt = ?
          WHERE id = ?`,
          [
            patient.name,
            patient.email,
            patient.phone,
            patient.cpf,
            patient.birthDate,
            patient.address.street,
            patient.address.number,
            patient.address.complement || '',
            patient.address.district,
            patient.address.city,
            patient.address.state,
            patient.address.zipCode,
            patient.emergencyContact.name,
            patient.emergencyContact.phone,
            patient.emergencyContact.relationship,
            JSON.stringify(patient.medicalInfo.conditions),
            JSON.stringify(patient.medicalInfo.medications),
            JSON.stringify(patient.medicalInfo.allergies),
            JSON.stringify(patient.medicalInfo.surgeries),
            patient.medicalInfo.familyHistory || '',
            patient.sessions,
            patient.progress,
            patient.status,
            patient.assignedPhysiotherapist,
            patient.updatedAt,
            patient.id,
          ]
        );
      },
      (error) => {
        console.error('Error updating patient:', error);
        reject(error);
      },
      () => {
        console.log('Patient updated successfully');
        resolve();
      }
    );
  });
};

export const deletePatient = (patientId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        // Delete patient's appointments first
        tx.executeSql('DELETE FROM appointments WHERE patientId = ?', [patientId]);
        
        // Delete patient
        tx.executeSql('DELETE FROM patients WHERE id = ?', [patientId]);
      },
      (error) => {
        console.error('Error deleting patient:', error);
        reject(error);
      },
      () => {
        console.log('Patient deleted successfully');
        resolve();
      }
    );
  });
};

// Appointment CRUD operations
export const createAppointment = (appointment: Appointment): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `INSERT INTO appointments (
            id, patientId, physiotherapistId, startTime, endTime,
            type, status, notes, tenantId, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            appointment.id,
            appointment.patientId,
            appointment.physiotherapistId,
            appointment.startTime,
            appointment.endTime,
            appointment.type,
            appointment.status,
            appointment.notes || '',
            appointment.tenantId,
            appointment.createdAt,
          ]
        );
      },
      (error) => {
        console.error('Error creating appointment:', error);
        reject(error);
      },
      () => {
        console.log('Appointment created successfully');
        resolve();
      }
    );
  });
};

export const getAppointmentsByPatient = (patientId: string): Promise<Appointment[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM appointments WHERE patientId = ? ORDER BY startTime DESC',
        [patientId],
        (_, { rows }) => {
          const appointments: Appointment[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            appointments.push({
              id: row.id,
              patientId: row.patientId,
              physiotherapistId: row.physiotherapistId,
              startTime: row.startTime,
              endTime: row.endTime,
              type: row.type,
              status: row.status,
              notes: row.notes,
              tenantId: row.tenantId,
              createdAt: row.createdAt,
            });
          }
          resolve(appointments);
        },
        (_, error) => {
          console.error('Error fetching appointments:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getAllAppointments = (): Promise<Appointment[]> => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM appointments ORDER BY startTime DESC',
        [],
        (_, { rows }) => {
          const appointments: Appointment[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            appointments.push({
              id: row.id,
              patientId: row.patientId,
              physiotherapistId: row.physiotherapistId,
              startTime: row.startTime,
              endTime: row.endTime,
              type: row.type,
              status: row.status,
              notes: row.notes,
              tenantId: row.tenantId,
              createdAt: row.createdAt,
            });
          }
          resolve(appointments);
        },
        (_, error) => {
          console.error('Error fetching appointments:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const updateAppointment = (appointment: Appointment): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql(
          `UPDATE appointments SET
            startTime = ?, endTime = ?, type = ?, status = ?, notes = ?
          WHERE id = ?`,
          [
            appointment.startTime,
            appointment.endTime,
            appointment.type,
            appointment.status,
            appointment.notes || '',
            appointment.id,
          ]
        );
      },
      (error) => {
        console.error('Error updating appointment:', error);
        reject(error);
      },
      () => {
        console.log('Appointment updated successfully');
        resolve();
      }
    );
  });
};

export const deleteAppointment = (appointmentId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(
      (tx) => {
        tx.executeSql('DELETE FROM appointments WHERE id = ?', [appointmentId]);
      },
      (error) => {
        console.error('Error deleting appointment:', error);
        reject(error);
      },
      () => {
        console.log('Appointment deleted successfully');
        resolve();
      }
    );
  });
};