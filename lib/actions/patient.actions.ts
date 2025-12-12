import { ID, Query } from "node-appwrite";
import { users } from "../appwrite.config";
import { parseStringify } from "../utils";

export const createUser = async (user: CreateUserParams) => {
  console.log("user:", users);
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
