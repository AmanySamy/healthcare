import AppointmentForm from "@/components/forms/AppointmentForm";
import { getPatient } from "@/lib/actions/patient.actions";
import Image from "next/image";
import React from "react";

const NewAppointment = async ({ params }: { params: { userId: string } }) => {
  const { userId } = params;
  const patient = await getPatient(userId);
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
          <AppointmentForm type='create' userID={userId} patientId={patient?.$id} />
          <p className="copyright py-12 justify-items-end text-dark-600 xl:text-left">
            © 2024 HealthStack. All rights reserved.
          </p>
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
