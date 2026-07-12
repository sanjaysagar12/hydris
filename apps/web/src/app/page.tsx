import { redirect } from "next/navigation";
import HomeClient from "./HomeClient";
import SupplierProfile from "@/components/supplier-profile/SupplierProfile";
import { getSession } from "@/lib/auth";
import { getSuppliers, getMySupplier } from "@/lib/suppliers.server";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (session.role === "SUPPLIER") {
    const supplier = await getMySupplier();
    return <SupplierProfile supplier={supplier} />;
  }

  const suppliers = await getSuppliers();
  return <HomeClient suppliers={suppliers} />;
}
