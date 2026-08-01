import { ID, Query } from "node-appwrite";
import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  tablesDB,
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { Appointment } from "@/types/appwrite.types";

export const createAppointment = async (
  appointment: CreateAppointmentParams,
) => {
  try {
    const newAppointment = await tablesDB.createRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      rowId: ID.unique(),
      data: {
        userId: appointment.userId,
        patient: appointment.patient,
        primaryPhysician: appointment.primaryPhysician,
        schedule: appointment.schedule,
        reason: appointment.reason,
        note: appointment.note,
        status: appointment.status,
      },
    });
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await tablesDB.getRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      rowId: appointmentId,
    });
    return parseStringify(appointment);
  } catch (error) {
    console.error("An error occurred while fetching the appointment:", error);
  }
};
//  GET RECENT APPOINTMENTS
export const getRecentAppointments = async (limit: number = 5) => {
  try {
    const appointments = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      queries: [Query.orderDesc("$createdAt")],
    });
    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };
    const counts = (appointments.rows as Appointment[]).reduce((acc, appointment) => {
      switch (appointment.status) {
        case "scheduled":
          acc.scheduledCount += 1;
          break;
        case "pending":
          acc.pendingCount += 1;
          break;
        case "cancelled":
          acc.cancelledCount += 1;
          break;
      }
      return acc;
    }, initialCounts);
    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.rows,
    }
    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while fetching recent appointments:",
      error,
    );
  }
};
