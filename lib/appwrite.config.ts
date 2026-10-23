import "server-only";
import * as sdk from "node-appwrite";
import {
  Client,
  TablesDB,
  Functions,
  Messaging,
  Storage,
  Users,
} from "node-appwrite";

export const PROJECT_ID =
  process.env.PROJECT_ID ?? process.env.NEXT_PUBLIC_PROJECT_ID;
const API_KEY = process.env.API_KEY;
export const DATABASE_ID = process.env.DATABASE_ID;
export const PATIENT_COLLECTION_ID = process.env.PATIENT_COLLECTION_ID;
export const DOCTOR_COLLECTION_ID = process.env.DOCTOR_COLLECTION_ID;
export const APPOINTMENT_COLLECTION_ID = process.env.APPOINTMENT_COLLECTION_ID;
export const BUCKET_ID = process.env.BUCKET_ID;
export const ENDPOINT =
  process.env.ENDPOINT ?? process.env.NEXT_PUBLIC_ENDPOINT;

export function createAccountClient() {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error("Appwrite endpoint and project must be configured");
  }
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

export function getAppwrite() {
  if (
    !API_KEY ||
    !DATABASE_ID ||
    !PATIENT_COLLECTION_ID ||
    !APPOINTMENT_COLLECTION_ID ||
    !BUCKET_ID
  ) {
    throw new Error("Server Appwrite configuration is incomplete");
  }
  const client = createAccountClient().setKey(API_KEY);
  return {
    account: new sdk.Account(client),
    tablesDB: new TablesDB(client),
    databases: new sdk.Databases(client),
    storage: new Storage(client),
    functions: new Functions(client),
    messaging: new Messaging(client),
    users: new Users(client),
  };
}
