import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import {
    getConfig,
    getUserById,
    getUserState,
    getPreguntaRecibida,
    listParticipants,
} from "@/lib/db";
import PerfilClient from "./PerfilClient";

export const dynamic = "force-dynamic";

export default async function Perfil() {

    const session = await getSessionUser();
    if (!session) {
        redirect("/");
    }

    const [me, recibida, config, participants, yo] = await Promise.all([
        getUserById(session.sub),
        getPreguntaRecibida(session.sub),
        getConfig(),
        listParticipants(),
        getUserState(session.sub),
    ]);

    const evento = {
        estado: config?.estado ?? "abierto",
        total: participants.length,
        listos: participants.filter((p) => p.estado === "listo").length,
        listo_yo: yo?.estado === "listo",
        tengo_asignado: Boolean(yo?.asignado_id),
    };

    const hobbies = Array.isArray(me?.hobbies)
        ? me.hobbies
        : me?.hobbies
          ? String(me.hobbies).split(",").map((h) => h.trim())
          : [];

    const perfil = {
        nombre: me?.nombre ?? "",
        hobbies,
        tallas: me?.tallas ?? {},
        palabra_vetada: me?.palabra_vetada ?? "",
    };

    return <PerfilClient me={perfil} preguntaInicial={recibida} eventoInicial={evento} />;
}
