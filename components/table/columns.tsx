"use client";
import Image from "next/image";
import { Appointment } from "@/types/appwrite.types";
import { ColumnDef, tableFeatures } from "@tanstack/react-table";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "../StatusBadge";
import { Doctors } from "@/constants";
import { AppointmentModal } from "../AppointmentModal";
import { DataTableFeatures } from "./data-table-features";
const features = tableFeatures({})
export const columns: ColumnDef<DataTableFeatures, Appointment>[] = [
  {
    header: "#",
    cell: ({ row }) => {
      return <p className="text-14-medium">{row.index + 1}</p>;
    },
  },
  {
    accessorKey: "patient",
    header: "Patient",
    cell: ({ row }) => {
      const appointment = row.original;
      return <p className="text-14-medium">{appointment.patient.name}</p>;
    },
  },
  {
    accessorKey: "schedule",
    header: "Schedule",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <p className="text-14-regular min-w-[100px]">
          {formatDateTime(appointment.schedule).dateTime}
        </p>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const appointment = row.original;
      return (
        <div className="min-w-[115px]">
          <StatusBadge status={appointment.status} />
        </div>
      );
    },
  },
  {
    accessorKey: "primaryPhysician",
    header: "Doctor",
    cell: ({ row }) => {
      const appointment = row.original;

      const doctor = Doctors.find(
        (doctor) => doctor.name === appointment.primaryPhysician,
      );
      return (
        <div className="flex items-center gap-3">
          {doctor && (
            <Image
              src={doctor.image}
              alt={doctor.name}
              width={100}
              height={100}
              className="size-8"
            />
          )}
          <p className="text-14-medium whitespace-nowrap">Dr.{doctor?.name}</p>
        </div>
      );
    },
  },
  {
     id: "actions",
    header: () => <div className="pl-4">Actions</div>,
    cell: ({ row }) => {
      const appointment = row.original;

      return (
        <div className="flex gap-1">
          <AppointmentModal
            patientId={appointment.patient.$id}
            userId={appointment.userId}
            appointment={appointment}
            type="schedule"
            title="Schedule Appointment"
            description="Please confirm the following details to schedule."
          />
          <AppointmentModal
            patientId={appointment.patient.$id}
            userId={appointment.userId}
            appointment={appointment}
            type="cancel"
            title="Cancel Appointment"
            description="Are you sure you want to cancel your appointment?"
          />
        </div>
      );
    }
  }
];
