"use client";
import React from "react";
import Image from "next/image";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control, Form } from "react-hook-form";
import { FormFieldType } from "./forms/PatientForm";
import "react-phone-number-input/style.css";
import PhoneInput, { E164Number } from "react-phone-number-input";
interface CustomProps {
  control: Control<any>; // Adjust the type based on your form library
  fieldType?: FormFieldType;
  name: string;
  label?: string;
  placeholder?: string;
  iconSrc?: string;
  iconAlt?: string;
  disabled?: boolean;
  dateFormat?: string;
  showTimeSelect?: boolean;
  children?: React.ReactNode;
}

const RenderField = ({ field, props }: { field: any; props: CustomProps }) => {
  const { control, fieldType, name, label, placeholder, iconSrc, iconAlt } =
    props;
  switch (fieldType) {
    case FormFieldType.INPUT:
      return (
        <div className="flex rounded-md border border-dark-500 bg-dark-400">
          {iconSrc && (
            <Image
              src={iconSrc}
              alt={iconAlt || "icon"}
              className="ml-2"
              width={24}
              height={24}
            />
          )}
          <FormControl>
            <Input
              {...field}
              className="shad-input border-0 "
              type="text"
              placeholder={placeholder || "john doe"}
            />
          </FormControl>
        </div>
      );
    case FormFieldType.PHONE_INPUT:
      return (
        <FormControl className="flex rounded-md border border-dark-500 bg-dark-400">
          <PhoneInput
            defaultCountry="EG"
            placeholder={placeholder || "Enter phone number"}
            value={field.value as E164Number | undefined}
            onChange={field.onChange}
            international
            withCountryCallingCode
            className="input-phone"
          />
        </FormControl>
      );
    default:
      return null;
  }
};
const CustomFormField = (props: CustomProps) => {
  const { control, fieldType, name, label, placeholder, iconSrc, iconAlt } =
    props;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex-1">
          {fieldType !== FormFieldType.CHECKBOX && props.label && (
            <FormLabel>{label}</FormLabel>
          )}
          <RenderField field={field} props={props} />

          <FormMessage className="shad-error" />
        </FormItem>
      )}
    />
  );
};

export default CustomFormField;
