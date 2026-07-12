import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSuppliers } from "@/lib/suppliers.server";
import DocumentUploadClient from "@/components/document-upload/DocumentUploadClient";

export default async function DocumentUploadPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "ADMIN") redirect("/");

  const suppliers = await getSuppliers();
  return <DocumentUploadClient suppliers={suppliers} />;
}
