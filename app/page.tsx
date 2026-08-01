import Image from "next/image";
import PatientForm from "../components/forms/PatientForm";
import Link from "next/link";
import PassKeyModal from "@/components/PassKeyModal";

export default function Home({searchParams}: {searchParams: {admin: string}}) {
  const isAdmin = searchParams.admin === "true";
  return (
    <div className="flex h-screen max-h-screen">
      {isAdmin && <PassKeyModal />}
      <section className="remove-scrollbar container my-auto">
        <div className="sub-container max-w-[496px]">
          <Image
            src="/assets/icons/logo-full.svg"
            alt="Logo"
            width={1000}
            height={1000}
            className="mb-12 h-10 w-fit"
          />
          <PatientForm />
          <div className="text-14-regular mt-20 flex justify-end">
            <Link href="/?admin-true" className="text-green-500">Admin</Link>
          </div>
        </div>
      </section>

        <Image
          className="side-img max-w-[50%]"
          src="/assets/images/onboarding-img.png"
          alt="Onboarding image"
          width={1000}
          height={1000}
          priority
        />

    </div>
  );
}
