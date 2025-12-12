"use client";
import React, { use } from "react";

import { set, z } from "zod";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomFormField from "../CustomFormField";
import SubmitButton from "../SubmitButton";
import { UserFormValidation } from "@/lib/validation";
import { useRouter } from "next/navigation";
import { createUser } from "@/lib/actions/patient.actions";
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
const form = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters long" })
    .max(50, { message: "Username must be at most 50 characters long" }),
});
const PatientForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

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
    try {
      const user = {
        name: values.name,
        email: values.email,
        phone: values.phone,
      };
      const newUser = await createUser(user);
      if (newUser) {
        router.push(`/patients/${newUser.$id}/register`);
      }
    } catch (error) {
      console.log(error);
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
        <SubmitButton isLoading={isLoading}>Get Started</SubmitButton>
      </form>
    </Form>
  );
};

export default PatientForm;
