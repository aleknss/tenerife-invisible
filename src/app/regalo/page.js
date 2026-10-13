"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import NavBar from "@/components/NavBar/NavBar";
import "./regalo.css";

export default function Regalo() {

    const [cargando, setCargando] = useState(true);
    const [amigo, setAmigo] = useState(null);
    const [preguntaEnviada, setPreguntaEnviada] = useState(null);
    const [texto, setTexto] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function cargar() {
            try {
                const [asignadoRes, preguntaRes] = await Promise.all([
                    fetch("/api/me/asignado"),
                    fetch("/api/me/pregunta")
                ]);

                if (asignadoRes.ok) {
                    const datos = await asignadoRes.json();
                    setAmigo(datos.asignado ?? null);
                    if (datos.asignado && !datos.viewed_at) {
                        await fetch("/api/me/viewed", { method: "POST" });
                    }
                }

                if (preguntaRes.ok) {
                    const datos = await preguntaRes.json();
                    setPreguntaEnviada(datos.enviada ?? null);
                }
            } catch (err) {
                console.error("Error:", err);
                setError("No se pudo cargar el amigo invisible");
            } finally {
                setCargando(false);
            }
        }

        cargar();
    }, []);

    async function enviarMensaje(e) {

        e.preventDefault();

        setMensaje("");
        setError("");

        try {

            const res = await fetch("/api/me/pregunta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texto })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo enviar el mensaje");
                return;
            }

            setPreguntaEnviada({ texto, respuesta: null, respondida_at: null });
            setTexto("");
            setMensaje("Mensaje enviado");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    if (cargando) {
        return (
            <main className="regalo-page">
                <div className="regalo-cards">
                    <Card>
                        <h1>Tu amigo invisible</h1>
                        <p>Cargando…</p>
                    </Card>
                </div>
                <NavBar activePage="regalo" />
            </main>
        );
    }

    if (amigo === null) {
        return (
            <main className="regalo-page">

                <div className="regalo-cards">

                    <Card>
                        <h1>Tu amigo invisible</h1>

                        <p>
                            Todavía no se han elegido las parejas.
                        </p>
                    </Card>

                </div>

                <NavBar activePage="regalo" />

            </main>
        );
    }

    const gustos = (amigo.hobbies ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean);

    return (
        <main className="regalo-page">

            <div className="regalo-cards">

                <Card>

                    <h1>Tu amigo invisible</h1>

                    <h2>Nombre</h2>
                    <p>{amigo.nombre}</p>

                    <h2>Le gusta</h2>
                    {gustos.length > 0 ? (
                        <ul>
                            {gustos.map((gusto) => (
                                <li key={gusto}>{gusto}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Sin datos todavía.</p>
                    )}

                    <h2>Regalo vetado</h2>
                    <p>{amigo.palabra_vetada || "Ninguno"}</p>

                    <h2>Tallas</h2>
                    <p>Camisa: {amigo.tallas?.camisa || "-"}</p>
                    <p>Pantalón: {amigo.tallas?.pantalon || "-"}</p>
                    <p>Zapatos: {amigo.tallas?.zapatos || "-"}</p>

                </Card>

                <Card>

                    <h1>Mensaje</h1>

                    <h3>Solo tienes una pregunta y no seas muy obvio</h3>

                    {mensaje && <p role="status">{mensaje}</p>}
                    {error && <p className="regalo-error" role="alert">{error}</p>}

                    {preguntaEnviada ? (
                        <>
                            <p className="mensaje">
                                {preguntaEnviada.texto}
                            </p>

                            <h2>Respuesta</h2>

                            <p className="mensaje">
                                {preguntaEnviada.respuesta || "No hay respuesta aún"}
                            </p>
                        </>
                    ) : (
                        <form onSubmit={enviarMensaje}>

                            <input
                                type="text"
                                placeholder="Escribe un mensaje anónimo..."
                                value={texto}
                                onChange={(e) => setTexto(e.target.value)}
                                required
                            />

                            <Button>
                                Enviar mensaje
                            </Button>

                        </form>
                    )}

                </Card>

            </div>

            <NavBar activePage="regalo" />

        </main>
    );
}
