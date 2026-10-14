"use client";

import { useEffect, useState } from "react";
import { Gift, MessageCircle, User, Heart, Ban, Shirt } from "lucide-react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./regalo.css";

export default function RegaloClient({ amigo, viewedAt, enviada }) {

    const [revelando, setRevelando] = useState(Boolean(amigo) && !viewedAt);
    const [enviadas, setEnviadas] = useState(enviada ? [enviada] : []);
    const [plantilla, setPlantilla] = useState(null);
    const [valor, setValor] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (!amigo || viewedAt) {
            return;
        }

        window.dispatchEvent(new Event("regalo-visto"));

        (async () => {
            try {
                await fetch("/api/me/viewed", { method: "POST" });
            } catch (err) {
                console.error("Error:", err);
            }
        })();

        const temporizador = setTimeout(() => setRevelando(false), 3200);

        return () => clearTimeout(temporizador);
    }, [amigo, viewedAt]);

    useEffect(() => {
        let activo = true;

        (async () => {
            try {
                const res = await fetch("/api/me/pregunta");
                if (!res.ok) {
                    return;
                }
                const datos = await res.json();
                if (activo) {
                    setEnviadas(datos.enviadas ?? []);
                    setPlantilla(datos.plantilla ?? null);
                }
            } catch (err) {
                console.error("Error:", err);
            }
        })();

        return () => {
            activo = false;
        };
    }, []);

    async function enviarMensaje(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setEnviando(true);

        try {

            const res = await fetch("/api/me/pregunta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plantilla_id: plantilla?.id, valor })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo enviar el mensaje");
                return;
            }

            const fresco = await fetch("/api/me/pregunta")
                .then((r) => r.json())
                .catch(() => null);
            if (fresco) {
                setEnviadas(fresco.enviadas ?? []);
                setPlantilla(fresco.plantilla ?? null);
            }
            setValor("");
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

                    <h3>Completa la plantilla para preguntar.</h3>

                    {mensaje && <p className="form-message" role="status">{mensaje}</p>}
                    {error && <p className="form-error" role="alert">{error}</p>}

                    {enviadas.map((q) => (
                        <div className="qa" key={q.id}>
                            <span className="qa-label">Tu pregunta</span>
                            <p className="qa-bubble qa-bubble-q">
                                {q.texto}
                            </p>

                            <span className="qa-link" />

                            <span className="qa-label">Respuesta</span>
                            <p className="qa-bubble qa-bubble-a">
                                {q.respuesta || "Aún sin respuesta"}
                            </p>
                        </div>
                    ))}

                    {plantilla ? (
                        <form onSubmit={enviarMensaje}>

                            <p className="qa-label">{plantilla.texto.replace("___", "…")}</p>

                            {plantilla.tipo === "tema" ? (
                                <select
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Elige una opción</option>
                                    {plantilla.opciones.map((opcion) => (
                                        <option key={opcion} value={opcion}>{opcion}</option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    type="text"
                                    maxLength={40}
                                    placeholder="Una palabra o frase corta…"
                                    value={valor}
                                    onChange={(e) => setValor(e.target.value)}
                                    required
                                />
                            )}

                            <Button disabled={enviando}>
                                {enviando ? "Enviando…" : "Enviar mensaje"}
                            </Button>

                        </form>
                    ) : enviadas.length === 0 ? (
                        <p>Achuchando…</p>
                    ) : null}

                </Card>

            </div>

            {revelando && (
                <div className="reveal" role="status" aria-live="polite">
                    <div className="reveal-box">
                        <Gift className="reveal-icon" size={72} />
                        <p>¡Te ha tocao!</p>
                        <span className="reveal-name">¡¡{amigo.nombre}!!</span>
                    </div>
                </div>
            )}

        </main>
    );
}
