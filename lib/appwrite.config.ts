import * as sdk from "node-appwrite";
import {
  Client,
  TablesDB,
  Functions,
  Messaging,
  Storage,
  Users,
} from "node-appwrite";

export const PROJECT_ID = process.env.NEXT_PUBLIC_PROJECT_ID;
export const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
export const DATABASE_ID = process.env.NEXT_PUBLIC_DATABASE_ID;
export const PATIENT_COLLECTION_ID =
  process.env.NEXT_PUBLIC_PATIENT_COLLECTION_ID;
export const DOCTOR_COLLECTION_ID =
  process.env.NEXT_PUBLIC_DOCTOR_COLLECTION_ID;
export const APPOINTMENT_COLLECTION_ID =
  process.env.NEXT_PUBLIC_APPOINTMENT_COLLECTION_ID;
export const BUCKET_ID = process.env.NEXT_PUBLIC_BUCKET_ID;
export const ENDPOINT = process.env.NEXT_PUBLIC_ENDPOINT;

const client = new Client();
client
  .setEndpoint(ENDPOINT!) // Your API Endpoint
  .setProject(PROJECT_ID!) // Your project ID
  .setKey(API_KEY!);
console.log('ENDPOINT',ENDPOINT);
export const tablesDB = new TablesDB(client);
export const databases = new sdk.Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const messaging = new Messaging(client);
export const users = new Users(client);
