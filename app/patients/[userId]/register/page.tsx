import RegisterForm from "@/components/forms/RegisterForm";
import { getUser } from "@/lib/actions/patient.actions";
import Image from "next/image";
import React from "react";

const Register = async ({ params }: SearchParamProps) => {
  const { userId } = await params;
  const user = await getUser(userId);
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
          <RegisterForm user={user} />
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

export default Register;
