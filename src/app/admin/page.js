import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getConfig, getUserState, listParticipants } from "@/lib/db";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function Admin() {

    const session = await getSessionUser();
    if (!session) {
        redirect("/");
    }
    if (session.role !== "admin") {
        redirect("/grupo");
    }

    const [participants, config, yo] = await Promise.all([
        listParticipants(),
        getConfig(),
        getUserState(session.sub),
    ]);

    const participantes = participants.map((p) => ({ id: p.id, nombre: p.nombre }));

    const estado = {
        estado: config?.estado ?? "abierto",
        total: participants.length,
        tengo_asignado: Boolean(yo?.asignado_id),
    };

    return (
        <AdminClient
            participantesIniciales={participantes}
            estadoInicial={estado}
            configInicial={config ?? {}}
        />
    );
}
