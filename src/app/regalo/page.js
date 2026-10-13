import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getReceptorProfile, getPreguntaEnviada } from "@/lib/db";
import RegaloClient from "./RegaloClient";

export const dynamic = "force-dynamic";

export default async function Regalo() {

    const session = await getSessionUser();
    if (!session) {
        redirect("/");
    }
    if (session.role === "admin") {
        redirect("/admin");
    }

    const [data, enviada] = await Promise.all([
        getReceptorProfile(session.sub),
        getPreguntaEnviada(session.sub),
    ]);

    return (
        <RegaloClient
            amigo={data?.receptor ?? null}
            viewedAt={data?.viewed_at ?? null}
            enviada={enviada ?? null}
        />
    );
}
