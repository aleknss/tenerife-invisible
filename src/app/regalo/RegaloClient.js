"use client";

import { useEffect, useState } from "react";
import { Gift, MessageCircle, User, Heart, Ban, Shirt } from "lucide-react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
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
            <main className="app-page regalo-page">

                <div className="app-wide">

                    <Card>
                        <h1><Gift size={22} /> Tu amigo invisible</h1>

                        <p>
                            Todavía no se han elegido las parejas.
                        </p>
                    </Card>

                </div>

            </main>
        );
    }

    const gustos = Array.isArray(amigo.hobbies)
        ? amigo.hobbies.filter(Boolean)
        : (amigo.hobbies ?? "").split(",").map((g) => g.trim()).filter(Boolean);

    return (
        <main className="app-page regalo-page">

            <div className="app-wide regalo-grid">

                <Card>

                    <h1><Gift size={22} /> Tu amigo invisible</h1>

                    <h2><User size={15} /> Nombre</h2>
                    <p>{amigo.nombre}</p>

                    <h2><Heart size={15} /> Le gusta</h2>
                    {gustos.length > 0 ? (
                        <ul>
                            {gustos.map((gusto) => (
                                <li key={gusto}>{gusto}</li>
                            ))}
                        </ul>
                    ) : (
                        <p>Sin datos todavía.</p>
                    )}

                    <h2><Ban size={15} /> Regalo vetado</h2>
                    <p>{amigo.palabra_vetada || "Ninguno"}</p>

                    <h2><Shirt size={15} /> Tallas</h2>
                    <p>Camisa: {amigo.tallas?.camisa || "-"}</p>
                    <p>Pantalón: {amigo.tallas?.pantalon || "-"}</p>
                    <p>Zapatos: {amigo.tallas?.zapatos || "-"}</p>

                </Card>

                <Card>

                    <h1><MessageCircle size={22} /> Mensaje</h1>

                    <h3>Solo tienes una pregunta y no seas muy obvio</h3>

                    {mensaje && <p className="form-message" role="status">{mensaje}</p>}
                    {error && <p className="form-error" role="alert">{error}</p>}

                    {preguntaEnviada ? (
                        <div className="qa">
                            <span className="qa-label">Tu pregunta</span>
                            <p className="qa-bubble qa-bubble-q">
                                {preguntaEnviada.texto}
                            </p>

                            <span className="qa-link" />

                            <span className="qa-label">Respuesta</span>
                            <p className="qa-bubble qa-bubble-a">
                                {preguntaEnviada.respuesta || "Aún sin respuesta"}
                            </p>
                        </div>
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

        </main>
    );
}
