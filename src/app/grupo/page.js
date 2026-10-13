"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import NavBar from "@/components/NavBar/NavBar";
import "./grupo.css";

export default function Grupo() {

    const [config, setConfig] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function cargar() {
            try {
                const res = await fetch("/api/config");
                const datos = await res.json().catch(() => ({}));

                if (!res.ok) {
                    setError(datos.error ?? "No se pudo cargar el evento");
                    return;
                }

                setConfig(datos);
            } catch (err) {
                console.error("Error:", err);
                setError("Error de conexión");
            } finally {
                setCargando(false);
            }
        }

        cargar();
    }, []);

    return (
        <main>

            <Card>

                <h1>{config?.nombre || "Amigo invisible"}</h1>

                {cargando && <p>Cargando…</p>}
                {error && <p className="grupo-error" role="alert">{error}</p>}

                {config && !cargando && (
                    <>
                        {config.fecha_entrega && (
                            <>
                                <h2>Fecha</h2>
                                <p>{config.fecha_entrega}</p>
                            </>
                        )}

                        {config.precio != null && (
                            <>
                                <h2>Precio</h2>
                                <p>{config.precio} {config.moneda}</p>
                            </>
                        )}

                        {config.tematica && (
                            <>
                                <h2>Temática</h2>
                                <p>{config.tematica}</p>
                            </>
                        )}

                        {config.metodo_entrega && (
                            <>
                                <h2>Entrega</h2>
                                <p>{config.metodo_entrega}</p>
                            </>
                        )}

                        {config.reglas && (
                            <>
                                <h2>Reglas</h2>
                                <p>{config.reglas}</p>
                            </>
                        )}
                    </>
                )}

            </Card>

            <NavBar activePage="grupo" />

        </main>
    );
}
