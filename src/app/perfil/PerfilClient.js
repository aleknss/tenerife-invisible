"use client";

import { useEffect, useState } from "react";
import { User, KeyRound, Flag, MessageCircle, Heart, Ban, Shirt } from "lucide-react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./perfil.css";

export default function PerfilClient({ me, preguntaInicial, eventoInicial }) {

    const [nombre] = useState(me?.nombre ?? "");
    const [hobbies, setHobbies] = useState(() => [
        me?.hobbies?.[0] ?? "",
        me?.hobbies?.[1] ?? "",
        me?.hobbies?.[2] ?? "",
    ]);
    const [palabraVetada, setPalabraVetada] = useState(me?.palabra_vetada ?? "");
    const [tallas, setTallas] = useState({
        camisa: me?.tallas?.camisa ?? "",
        pantalon: me?.tallas?.pantalon ?? "",
        zapatos: me?.tallas?.zapatos ?? ""
    });

    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");

    const [recibidas, setRecibidas] = useState(preguntaInicial ? [preguntaInicial] : []);
    const [respuestas, setRespuestas] = useState({});

    const [estadoEvento] = useState(eventoInicial ?? null);
    const [guardando, setGuardando] = useState(false);
    const [cambiandoPass, setCambiandoPass] = useState(false);
    const [respondiendo, setRespondiendo] = useState(false);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

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
                    setRecibidas(datos.recibidas ?? []);
                }
            } catch (err) {
                console.error("Error:", err);
            }
        })();

        return () => {
            activo = false;
        };
    }, []);

    function cambiarHobby(index, valor) {
        setHobbies((prev) => prev.map((h, i) => (i === index ? valor : h)));
    }

    function cambiarTalla(campo, valor) {
        setTallas((prev) => ({ ...prev, [campo]: valor }));
    }

    async function guardarPerfil(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setGuardando(true);

        try {

            const res = await fetch("/api/me/form", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hobbies: hobbies.map((h) => h.trim()).filter(Boolean),
                    palabra_vetada: palabraVetada,
                    tallas
                })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo guardar el perfil");
                return;
            }

            setMensaje("Perfil guardado");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setGuardando(false);
        }
    }

    async function cambiarPassword(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setCambiandoPass(true);

        try {

            const res = await fetch("/api/me/password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ actual, nueva })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo cambiar la contraseña");
                return;
            }

            setActual("");
            setNueva("");
            setMensaje("Contraseña actualizada");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setCambiandoPass(false);
        }
    }

    async function responderPregunta(e, q) {

        e.preventDefault();

        const texto = respuestas[q.id] ?? "";

        setMensaje("");
        setError("");
        setRespondiendo(true);

        try {

            const res = await fetch("/api/me/pregunta/respuesta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pregunta_id: q.id, respuesta: texto })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo enviar la respuesta");
                return;
            }

            setRecibidas((prev) =>
                prev.map((p) =>
                    p.id === q.id
                        ? { ...p, respuesta: texto, respondida_at: new Date().toISOString() }
                        : p
                )
            );
            setRespuestas((prev) => ({ ...prev, [q.id]: "" }));
            setMensaje("Respuesta enviada");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setRespondiendo(false);
        }
    }

    return (
        <main className="app-page perfil-page">

            <div className="app-stack">

                <Card>

                    <h1><User size={22} /> Mi perfil</h1>

                    {nombre && <p>Hola, {nombre}</p>}

                    {mensaje && <p className="form-message" role="status">{mensaje}</p>}
                    {error && <p className="form-error" role="alert">{error}</p>}

                    <form onSubmit={guardarPerfil} className="cols">

                        <h2><Heart size={15} /> 3 cosas que me gustan</h2>

                        {hobbies.map((hobby, index) => (
                            <input
                                key={index}
                                type="text"
                                placeholder={`Cosa que me gusta ${index + 1}`}
                                value={hobby}
                                onChange={(e) => cambiarHobby(index, e.target.value)}
                            />
                        ))}

                        <h2><Ban size={15} /> Regalo vetado</h2>

                        <input
                            type="text"
                            placeholder="Algo que no quiero que me regalen"
                            value={palabraVetada}
                            onChange={(e) => setPalabraVetada(e.target.value)}
                        />

                        <h2><Shirt size={15} /> Tallas</h2>

                        <input
                            type="text"
                            placeholder="Talla de camisa"
                            value={tallas.camisa}
                            onChange={(e) => cambiarTalla("camisa", e.target.value)}
                        />

                        <input
                            type="text"
                            placeholder="Talla de pantalón"
                            value={tallas.pantalon}
                            onChange={(e) => cambiarTalla("pantalon", e.target.value)}
                        />

                        <input
                            type="text"
                            placeholder="Talla de zapatos"
                            value={tallas.zapatos}
                            onChange={(e) => cambiarTalla("zapatos", e.target.value)}
                        />

                        <Button disabled={guardando}>
                            {guardando ? "Guardando…" : "Guardar"}
                        </Button>

                    </form>

                </Card>

                <Card>

                    <h1><MessageCircle size={22} /> Pregunta del amigo invisible</h1>

                    {recibidas.length === 0 ? (
                        <p>
                            De momento no te ha preguntado nada.
                        </p>
                    ) : (
                        recibidas.map((q) => (
                            <div key={q.id}>
                                <div className="qa">
                                    <span className="qa-label">Pregunta</span>
                                    <p className="qa-bubble qa-bubble-q">
                                        {q.texto}
                                    </p>

                                    {q.respondida_at && (
                                        <>
                                            <span className="qa-link" />
                                            <span className="qa-label">Tu respuesta</span>
                                            <p className="qa-bubble qa-bubble-a">
                                                {q.respuesta}
                                            </p>
                                        </>
                                    )}
                                </div>

                                {!q.respondida_at && (
                                    <form onSubmit={(e) => responderPregunta(e, q)}>

                                        <input
                                            type="text"
                                            placeholder="Escribe tu respuesta"
                                            value={respuestas[q.id] ?? ""}
                                            onChange={(e) =>
                                                setRespuestas((prev) => ({ ...prev, [q.id]: e.target.value }))
                                            }
                                            required
                                        />

                                        <Button disabled={respondiendo}>
                                            {respondiendo ? "Enviando…" : "Enviar"}
                                        </Button>

                                    </form>
                                )}
                            </div>
                        ))
                    )}

                </Card>

                <Card>

                    <h1><KeyRound size={22} /> Cambiar contraseña</h1>

                    <form onSubmit={cambiarPassword}>

                        <input
                            type="password"
                            placeholder="Contraseña actual"
                            value={actual}
                            onChange={(e) => setActual(e.target.value)}
                            autoComplete="current-password"
                            required
                        />

                        <input
                            type="password"
                            placeholder="Contraseña nueva"
                            value={nueva}
                            onChange={(e) => setNueva(e.target.value)}
                            autoComplete="new-password"
                            required
                        />

                        <Button disabled={cambiandoPass}>
                            {cambiandoPass ? "Cambiando…" : "Cambiar contraseña"}
                        </Button>

                    </form>

                </Card>

                <Card>

                    <h1><Flag size={22} /> Estado</h1>

                    {estadoEvento ? (
                        <p>Evento: {estadoEvento.estado}</p>
                    ) : (
                        <p>Achuchando…</p>
                    )}

                </Card>

            </div>

        </main>
    );
}
