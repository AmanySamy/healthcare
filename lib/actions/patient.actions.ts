"use server";

import { Account, ID, Query } from "node-appwrite";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  createAccountClient,
  getAppwrite,
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { InputFile } from "node-appwrite/file";
import { PATIENT_COOKIE, cookieOptions, requirePatientOrAdmin } from "../auth";
import { allowAuthAttempt } from "../auth-rate-limit";
import { PatientFormValidation, UserFormValidation } from "../validation";

export const createUser = async (user: CreateUserParams) => {
  try {
    const input = UserFormValidation.parse(user);
    if (!(await allowAuthAttempt("email-send", input.email.toLowerCase())))
      throw new Error();
    const { users } = getAppwrite();
    const existingUsers = await users.list({
      queries: [Query.equal("email", [input.email])],
    });
    const token = await new Account(createAccountClient()).createEmailToken({
      userId: existingUsers.users[0]?.$id ?? ID.unique(),
      email: input.email,
    });
    return { $id: token.userId };
  } catch {
    throw new Error(
      "Unable to send a verification code. Please try again later.",
    );
  }
};

export const verifyPatientCode = async (
  userId: string,
  code: string,
  user: CreateUserParams,
) => {
  try {
    const input = UserFormValidation.parse(user);
    z.string().min(1).max(36).parse(userId);
    z.string()
      .regex(/^\d{6}$/)
      .parse(code);
    if (!(await allowAuthAttempt("email-verify", userId))) throw new Error();
    const { account, users } = getAppwrite();
    const session = await account.createSession({ userId, secret: code });
    if (!session.secret) throw new Error();
    const verified = await new Account(
      createAccountClient().setSession(session.secret),
    ).get();
    if (
      verified.$id !== userId ||
      verified.email.toLowerCase() !== input.email.toLowerCase()
    )
      throw new Error();
    if (verified.name !== input.name)
      await users.updateName({ userId, name: input.name });
    if (verified.phone !== input.phone)
      await users.updatePhone({ userId, number: input.phone });
    (await cookies()).set(PATIENT_COOKIE, session.secret, {
      ...cookieOptions,
      expires: new Date(session.expire),
    });
    return { $id: userId };
  } catch {
    throw new Error("Unable to verify the code. Please try again later.");
  }
};

export const getUser = async (userId: string) => {
  await requirePatientOrAdmin(userId);
  try {
    const { users } = getAppwrite();
    const user = await users.get({
      userId: userId,
    });
    return {
      $id: user.$id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
  } catch {
    throw new Error("Unable to retrieve user details");
  }
};

export const registerPatient = async ({
  identificationDocument,
  userId,
  name,
  email,
  phone,
  birthDate,
  gender,
  address,
  occupation,
  emergencyContactName,
  emergencyContactNumber,
  primaryPhysician,
  insuranceProvider,
  insurancePolicyNumber,
  allergies,
  currentMedication,
  familyMedicalHistory,
  pastMedicalHistory,
  identificationType,
  identificationNumber,
  privacyConsent,
}: RegisterUserParams) => {
  await requirePatientOrAdmin(userId);
  try {
    const data = PatientFormValidation.omit({
      identificationDocument: true,
      treatmentConsent: true,
      disclosureConsent: true,
    }).parse({
      name,
      email,
      phone,
      birthDate,
      gender,
      address,
      occupation,
      emergencyContactName,
      emergencyContactNumber,
      primaryPhysician,
      insuranceProvider,
      insurancePolicyNumber,
      allergies,
      currentMedication,
      familyMedicalHistory,
      pastMedicalHistory,
      identificationType,
      identificationNumber,
      privacyConsent,
    });
    const { tablesDB, storage } = getAppwrite();
    let file;
    if (identificationDocument) {
      const upload = identificationDocument.get("blobFile");
      if (
        !(upload instanceof Blob) ||
        upload.size > 5 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
          upload.type,
        )
      ) {
        throw new Error("Invalid identification document");
      }
      const inputFile =
        identificationDocument &&
        InputFile.fromBuffer(
          identificationDocument?.get("blobFile") as Blob,
          identificationDocument?.get("fileName") as string,
        );

      file = await storage.createFile({
        bucketId: BUCKET_ID!,
        fileId: ID.unique(),
        file: inputFile!,
      });
    }

    const newPatient = await tablesDB.createRow({
      databaseId: DATABASE_ID!,
      tableId: PATIENT_COLLECTION_ID!,
      rowId: ID.unique(),
      data: {
        identificationDocumentId: file?.$id ? file.$id : null,
        identificationDocumentUrl: file?.$id
          ? `${ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${file.$id}/view?project=${PROJECT_ID}`
          : null,
        userId: userId,
        ...data,
        privacyConsent: undefined,
        PrivacyConsent: data.privacyConsent,
      },
    });

    return parseStringify(newPatient);
  } catch {
    throw new Error("Unable to register patient");
  }
};

export const getPatient = async (userId: string) => {
  await requirePatientOrAdmin(userId);
  try {
    const { tablesDB } = getAppwrite();
    const patients = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: PATIENT_COLLECTION_ID!,
      queries: [Query.equal("userId", [userId])],
    });

    const patient = patients.rows[0];
    if (!patient) return null;

    return parseStringify(patient);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === 404) {
      return null;
    }
    throw new Error("Unable to retrieve patient details");
  }
};
