"use server";

import { ID, Query } from "node-appwrite";
import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  PATIENT_COLLECTION_ID,
  getAppwrite,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";
import { Appointment } from "@/types/appwrite.types";
import { revalidatePath } from "next/cache";
import { requireAdmin, requirePatientOrAdmin } from "../auth";
import { CreateAppointmentSchema, getAppointmentSchema } from "../validation";
import { z } from "zod";

export const createAppointment = async (
  appointment: CreateAppointmentParams,
) => {
  await requirePatientOrAdmin(appointment.userId);
  try {
    const input = CreateAppointmentSchema.parse(appointment);
    const { tablesDB } = getAppwrite();
    const patient = await tablesDB.getRow({
      databaseId: DATABASE_ID!,
      tableId: PATIENT_COLLECTION_ID!,
      rowId: appointment.patient,
    });
    if (patient.userId !== appointment.userId) throw new Error();
    const newAppointment = await tablesDB.createRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      rowId: ID.unique(),
      data: {
        userId: appointment.userId,
        patient: appointment.patient,
        primaryPhysician: input.primaryPhysician,
        schedule: input.schedule,
        reason: input.reason,
        note: input.note,
        status: "pending",
      },
    });
    return parseStringify(newAppointment);
  } catch {
    throw new Error("Unable to create appointment");
  }
};

export const getAppointment = async (appointmentId: string, userId: string) => {
  await requirePatientOrAdmin(userId);
  try {
    const { tablesDB } = getAppwrite();
    const appointment = await tablesDB.getRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      rowId: appointmentId,
    });
    if (appointment.userId !== userId) throw new Error();
    return parseStringify(appointment);
  } catch {
    throw new Error("Unable to retrieve appointment");
  }
};
//  GET RECENT APPOINTMENTS
export const getRecentAppointments = async (limit: number = 5) => {
  await requireAdmin();
  try {
    const { tablesDB } = getAppwrite();
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
    const counts = (appointments.rows as Appointment[]).reduce(
      (acc, appointment) => {
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
      },
      initialCounts,
    );
    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.rows,
    };
    return parseStringify(data);
  } catch {
    throw new Error("Unable to retrieve appointments");
  }
};

//  SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  await requireAdmin();
  try {
    z.string().min(1).max(36).parse(userId);
    z.string().min(1).max(1600).parse(content);
    const { messaging } = getAppwrite();
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId],
    );
    return parseStringify(message);
  } catch {
    throw new Error("Unable to send notification");
  }
};

//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  await requireAdmin();
  try {
    if (type !== "schedule" && type !== "cancel") throw new Error();
    const input = getAppointmentSchema(type).parse(appointment);
    const { tablesDB } = getAppwrite();
    const updatedAppointment = await tablesDB.updateRow({
      databaseId: DATABASE_ID!,
      tableId: APPOINTMENT_COLLECTION_ID!,
      rowId: appointmentId,
      data: {
        primaryPhysician: input.primaryPhysician,
        schedule: input.schedule,
        status: type === "schedule" ? "scheduled" : "cancelled",
        cancellationReason: input.cancellationReason,
      },
    });
    if (!updatedAppointment) {
      throw new Error("Failed to update the appointment");
    }
    const smsMessage = `Greetings from CarePulse. ${type === "schedule" ? `Your appointment is confirmed for ${formatDateTime(input.schedule, timeZone).dateTime} with Dr. ${input.primaryPhysician}` : `Your appointment for ${formatDateTime(input.schedule, timeZone).dateTime} is cancelled. Please contact the clinic.`}.`;
    await sendSMSNotification(updatedAppointment.userId, smsMessage);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch {
    throw new Error("Unable to update appointment");
  }
};
