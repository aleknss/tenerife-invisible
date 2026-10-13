import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function Home() {

    const session = await getSessionUser();
    if (session) {
        redirect(session.role === "admin" ? "/admin" : "/grupo");
    }

    return <LoginClient />;
}
