"use server";

import { ID, Query, TablesDB } from "node-appwrite";
import {
  BUCKET_ID,
  DATABASE_ID,
  ENDPOINT,
  PATIENT_COLLECTION_ID,
  PROJECT_ID,
  tablesDB,
  storage,
  users,
} from "../appwrite.config";
import { parseStringify } from "../utils";
import { InputFile } from "node-appwrite/file";

export const createUser = async (user: CreateUserParams) => {
  try {
    const newUser = await users.create({
      userId: ID.unique(),
      email: user.email,
      password: "password",
      name: user.name,
      phone: user.phone,
    });
    return parseStringify(newUser);
  } catch (error: any) {
    if (error && error?.code === 409) {
      const documents = await users.list({
        queries: [Query.equal("email", [user.email])],
      });
      return documents.users[0];
    }
  }
};

export const getUser = async (userId: string) => {
  try {
    const user = await users.get({
      userId: userId,
    });
    return parseStringify(user);
  } catch (error) {
    console.log(error);
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
  try {
    let file;
    if (identificationDocument) {
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
        name: name,
        email: email,
        phone: phone,
        birthDate: birthDate,
        gender: gender,
        address: address,
        occupation: occupation,
        emergencyContactName: emergencyContactName,
        emergencyContactNumber: emergencyContactNumber,
        primaryPhysician: primaryPhysician,
        insuranceProvider: insuranceProvider,
        insurancePolicyNumber: insurancePolicyNumber,
        allergies: allergies,
        currentMedication: currentMedication,
        familyMedicalHistory: familyMedicalHistory,
        pastMedicalHistory: pastMedicalHistory,
        identificationType: identificationType,
        identificationNumber: identificationNumber,
        PrivacyConsent: privacyConsent,
      },
    });
    console.log("newPatient", newPatient);

    return parseStringify(newPatient);
  } catch (error) {
    console.error("An error occurred while creating a new patient:", error);
  }
};

export const getPatient = async (userId: string) => {
  try {
    const patients = await tablesDB.listRows({
      databaseId: DATABASE_ID!,
      tableId: PATIENT_COLLECTION_ID!,
      queries: [Query.equal("userId", [userId])],
    });

    return parseStringify(patients.rows[0]);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the patient details:",
      error,
    );
  }
};