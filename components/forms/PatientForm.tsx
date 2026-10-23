"use client";
import React from "react";

import { z } from "zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomFormField from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { UserFormValidation } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { createUser, verifyPatientCode } from "@/lib/actions/patient.actions";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
export enum FormFieldType {
  INPUT = "input",
  SELECT = "select",
  RADIO = "radio",
  CHECKBOX = "checkbox",
  TEXTAREA = "textarea",
  PHONE_INPUT = "phoneInput",
  DATE_PICKER = "datePicker",
  SKELETON = "skeleton",
}
const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [pendingUserId, setPendingUserId] = React.useState("");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState("");

  const form = useForm<z.infer<typeof UserFormValidation>>({
    resolver: zodResolver(UserFormValidation),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof UserFormValidation>) {
    setIsLoading(true);
    setError("");
    try {
      const user = {
        name: values.name,
        email: values.email,
        phone: values.phone,
      };
      if (pendingUserId) {
        const verified = await verifyPatientCode(pendingUserId, code, user);
        setCode("");
        router.push(`/patients/${verified.$id}/register`);
      } else {
        const newUser = await createUser(user);
        setPendingUserId(newUser.$id);
      }
    } catch {
      setCode("");
      setError(
        "Unable to verify access. Check your email code or try again later.",
      );
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1">
        <section className="mb-12 space-y-4">
          <h1 className="header">Hi There</h1>
          <p className="text-dark-700">👋 Schedule your first appointment</p>
        </section>
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          name="name"
          label="Full Name"
          placeholder="Jhon Doe"
          iconSrc="/assets/icons/user.svg"
          iconAlt="User Icon"
          control={form.control}
        />
        <CustomFormField
          fieldType={FormFieldType.INPUT}
          name="email"
          label="Email"
          placeholder="johndoe@example.com"
          iconSrc="/assets/icons/email.svg"
          iconAlt="Email Icon"
          control={form.control}
        />
        <CustomFormField
          fieldType={FormFieldType.PHONE_INPUT}
          name="phone"
          label="Phone"
          placeholder="(123) 456-7890"
          iconSrc="/assets/icons/phone.svg"
          iconAlt="Phone Icon"
          control={form.control}
        />
        {pendingUserId && (
          <div className="space-y-4">
            <label htmlFor="patient-code" className="shad-input-label">
              Email verification code
            </label>
            <InputOTP
              id="patient-code"
              maxLength={6}
              value={code}
              onChange={setCode}
              autoComplete="one-time-code"
            >
              <InputOTPGroup className="shad-otp">
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    className="shad-otp-slot"
                    index={index}
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <button
              type="button"
              className="text-14-regular"
              disabled={isLoading}
              onClick={() => {
                setPendingUserId("");
                setCode("");
              }}
            >
              Use another email
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="shad-error">
            {error}
          </p>
        )}
        <SubmitButton isLoading={isLoading}>
          {pendingUserId ? "Verify email" : "Get Started"}
        </SubmitButton>
      </form>
    </Form>
  );
};

export default PatientForm;
