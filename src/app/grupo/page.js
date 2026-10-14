import { redirect } from "next/navigation";
import Card from "@/components/Card/Card";
import Markdown from "@/components/Markdown/Markdown";
import CuentaAtras from "@/components/CuentaAtras/CuentaAtras";
import { PartyPopper, Calendar, Coins, ScrollText } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getConfig } from "@/lib/db";
import "./grupo.css";

export const dynamic = "force-dynamic";

export default async function Grupo() {

    const session = await getSessionUser();
    if (!session) {
        redirect("/");
    }
    if (session.role === "admin") {
        redirect("/admin");
    }

    const config = (await getConfig()) ?? {};

    return (
        <main className="app-page grupo-page">

            <div className="app-wide">

                <Card>

                    <h1><PartyPopper size={22} /> {config.nombre || "Amigo invisible"}</h1>

                    <div className="evento-grid">

                        <div className="evento-col">
                            {config.fecha_entrega && (
                                <>
                                    <h2><Calendar size={15} /> Fecha</h2>
                                    <p className="evento-dato">{config.fecha_entrega}</p>
                                    <CuentaAtras fecha={config.fecha_entrega} />
                                </>
                            )}

                            {(config.precio_min != null || config.precio_max != null) && (
                                <>
                                    <h2><Coins size={15} /> Precio</h2>
                                    <p className="evento-dato">
                                        {config.precio_min != null && config.precio_max != null
                                            ? `${config.precio_min}–${config.precio_max} ${config.moneda}`
                                            : `${config.precio_min ?? config.precio_max} ${config.moneda}`}
                                    </p>
                                </>
                            )}
                        </div>

                        <div className="evento-col">
                            {config.reglas && (
                                <>
                                    <h2><ScrollText size={15} /> Reglas</h2>
                                    <div className="markdown-body">
                                        <Markdown>{config.reglas}</Markdown>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>

                </Card>

            </div>

        </main>
    );
}
