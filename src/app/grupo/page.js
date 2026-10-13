import Card from "@/components/Card/Card";
import Markdown from "@/components/Markdown/Markdown";
import { getConfig } from "@/lib/db";
import "./grupo.css";

export const dynamic = "force-dynamic";

export default async function Grupo() {

    const config = (await getConfig()) ?? {};

    return (
        <main className="grupo-page">

            <Card>

                <h1>{config.nombre || "Amigo invisible"}</h1>

                {config.fecha_entrega && (
                    <>
                        <h2>Fecha</h2>
                        <p className="evento-dato">{config.fecha_entrega}</p>
                    </>
                )}

                {config.precio != null && (
                    <>
                        <h2>Precio</h2>
                        <p className="evento-dato">{config.precio} {config.moneda}</p>
                    </>
                )}

                {config.reglas && (
                    <>
                        <h2>Reglas</h2>
                        <div className="markdown-body">
                            <Markdown>{config.reglas}</Markdown>
                        </div>
                    </>
                )}

            </Card>

        </main>
    );
}
