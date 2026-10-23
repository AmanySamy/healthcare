import { requirePatientOrAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PatientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  try {
    await requirePatientOrAdmin(userId);
  } catch {
    redirect("/");
  }
  return children;
}
