import React from "react";
import Link from "next/link";
import Image from "next/image";
import StatCard from "@/components/StatCard";
import { getRecentAppointments } from "@/lib/actions/appointment.actions";
import { DataTable } from "@/components/table/DataTable";
import { columns } from "@/components/table/columns";
import { Appointment } from "@/types/appwrite.types";

const AdminPage = async () => {
  const appointments = await getRecentAppointments();
  console.log(appointments);


  const Statistics = [
    {
      type: "appointments",
      count: appointments.scheduledCount,
      label: "Scheduled Appointments",
      icon: "/assets/icons/appointments.svg",
    },
    {
      type: "pending",
      count: appointments.pendingCount,
      label: "Pending appointments",
      icon: "/assets/icons/pending.svg",
    },
    {
      type: "cancelled",
      count: appointments.cancelledCount,
      label: "Cancelled Appointments",
      icon: "/assets/icons/cancelled.svg",
    },
  ];
  // const data = await getData();
  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-14">
      <header className="admin-header">
        <Link href="/" className="cursor-pointer">
          <Image
            src="/assets/icons/logo-full.svg"
            alt="Logo"
            height={32}
            width={162}
          />
        </Link>
        <p className="text-16-semibold">Admin Dashboard</p>
      </header>
      <main className="admin-main">
        <section className="w-full space-y-4">
          <h1 className="header">Welcome 👋</h1>
          <p className="text-dark-700">
            Start the day with managing new appointments
          </p>
        </section>
        <section className="admin-stat">
          {Statistics.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </section>
        <DataTable columns={columns} data={appointments.documents} />
      </main>
    </div>
  );
};

export default AdminPage;
