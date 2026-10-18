import AppointmentForm from "@/components/forms/AppointmentForm";
import { getPatient } from "@/lib/actions/patient.actions";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import React from "react";
import * as Sentry from "@sentry/nextjs";

const NewAppointment = async ({
  params,
}: {
  params: Promise<{ userId: string }>;
}) => {
  const { userId } = await params;
  const patient = await getPatient(userId);
  if (!patient) notFound();
  if (patient.userId !== userId) {
    redirect(`/patients/${patient.userId}/new-appointment`);
  }
  Sentry.metrics.count("user_view_new_appointment", 1, {
    attributes: { user_name: patient.name },
  });
  return (
    <div className="flex h-screen max-h-screen">
      <section className="remove-scrollbar container">
        <div className="sub-container max-w-[860px] flex-1 flex-col py-10">
          <Image
            src="/assets/icons/logo-full.svg"
            alt="Logo"
            width={1000}
            height={1000}
            className="mb-12 h-10 w-fit"
          />
          <AppointmentForm type='create' userId={userId} patientId={patient?.$id} />

        </div>
      </section>

      <Image
        className="side-img max-w-[390px]"
        src="/assets/images/register-img.png"
        alt="Onboarding image"
        width={1000}
        height={1000}
        priority
      />
    </div>
  );
};

export default NewAppointment;
