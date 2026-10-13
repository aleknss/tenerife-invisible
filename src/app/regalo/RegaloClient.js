"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import NavBar from "@/components/NavBar/NavBar";
import "./regalo.css";

export default function RegaloClient({ amigo, viewedAt, enviada }) {

    const [preguntaEnviada, setPreguntaEnviada] = useState(enviada ?? null);
    const [texto, setTexto] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!amigo || viewedAt) {
            return;
        }

        async function marcarVisto() {
            try {
                await fetch("/api/me/viewed", { method: "POST" });
            } catch (err) {
                console.error("Error:", err);
            }
        }

        marcarVisto();
    }, [amigo, viewedAt]);

    async function enviarMensaje(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setEnviando(true);

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
        } finally {
            setEnviando(false);
        }
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

    const gustos = Array.isArray(amigo.hobbies)
        ? amigo.hobbies.filter(Boolean)
        : (amigo.hobbies ?? "").split(",").map((g) => g.trim()).filter(Boolean);

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

                    {mensaje && <p className="form-message" role="status">{mensaje}</p>}
                    {error && <p className="form-error" role="alert">{error}</p>}

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

                            <Button disabled={enviando}>
                                {enviando ? "Enviando…" : "Enviar mensaje"}
                            </Button>

                        </form>
                    )}

                </Card>

            </div>

            <NavBar activePage="regalo" />

        </main>
    );
}
