"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./perfil.css";
import NavBar from "@/components/NavBar/NavBar";

export default function Perfil() {

    const [nombre, setNombre] = useState("");
    const [hobbies, setHobbies] = useState(["", "", ""]);
    const [palabraVetada, setPalabraVetada] = useState("");
    const [tallas, setTallas] = useState({ camisa: "", pantalon: "", zapatos: "" });

    const [actual, setActual] = useState("");
    const [nueva, setNueva] = useState("");

    const [pregunta, setPregunta] = useState(null);
    const [respuesta, setRespuesta] = useState("");

    const [evento, setEvento] = useState(null);
    const [marcando, setMarcando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [cambiandoPass, setCambiandoPass] = useState(false);
    const [respondiendo, setRespondiendo] = useState(false);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function cargar() {
            try {
                const [meRes, preguntaRes, estadoRes] = await Promise.all([
                    fetch("/api/me"),
                    fetch("/api/me/pregunta"),
                    fetch("/api/estado")
                ]);

                if (meRes.ok) {
                    const me = await meRes.json();
                    setNombre(me.nombre ?? "");
                    setPalabraVetada(me.palabra_vetada ?? "");
                    setTallas({
                        camisa: me.tallas?.camisa ?? "",
                        pantalon: me.tallas?.pantalon ?? "",
                        zapatos: me.tallas?.zapatos ?? ""
                    });
                    const partes = (me.hobbies ?? "").split(",").map((h) => h.trim());
                    setHobbies([partes[0] ?? "", partes[1] ?? "", partes[2] ?? ""]);
                }

                if (preguntaRes.ok) {
                    const datos = await preguntaRes.json();
                    setPregunta(datos.recibida ?? null);
                }

                if (estadoRes.ok) {
                    setEvento(await estadoRes.json());
                }
            } catch (err) {
                console.error("Error:", err);
                setError("No se pudo cargar el perfil");
            }
        }

        cargar();
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
                    hobbies: hobbies.filter((h) => h.trim() !== "").join(", "),
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

    async function responderPregunta(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setRespondiendo(true);

        try {

            const res = await fetch("/api/me/pregunta/respuesta", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pregunta_id: pregunta?.id, respuesta })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo enviar la respuesta");
                return;
            }

            setPregunta((prev) => ({ ...prev, respuesta, respondida_at: new Date().toISOString() }));
            setRespuesta("");
            setMensaje("Respuesta enviada");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setRespondiendo(false);
        }
    }

    async function marcarListo() {

        setMensaje("");
        setError("");
        setMarcando(true);

        try {

            const res = await fetch("/api/me/listo", { method: "POST" });
            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo marcar como listo");
                return;
            }

            setMensaje("Marcado como listo");
            const estadoRes = await fetch("/api/estado");
            if (estadoRes.ok) {
                setEvento(await estadoRes.json());
            }

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setMarcando(false);
        }
    }

    return (
        <main className="perfil-page">

            <div className="perfil-cards">

                <Card>

                    <h1>Mi perfil</h1>

                    {nombre && <p>Hola, {nombre}</p>}

                    {mensaje && <p className="form-message" role="status">{mensaje}</p>}
                    {error && <p className="form-error" role="alert">{error}</p>}

                    <form onSubmit={guardarPerfil}>

                        <h2>3 cosas que me gustan</h2>

                        {hobbies.map((hobby, index) => (
                            <input
                                key={index}
                                type="text"
                                placeholder={`Cosa que me gusta ${index + 1}`}
                                value={hobby}
                                onChange={(e) => cambiarHobby(index, e.target.value)}
                            />
                        ))}

                        <h2>Regalo vetado</h2>

                        <input
                            type="text"
                            placeholder="Algo que no quiero que me regalen"
                            value={palabraVetada}
                            onChange={(e) => setPalabraVetada(e.target.value)}
                        />

                        <h2>Tallas</h2>

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

                    <h1>Cambiar contraseña</h1>

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

                    <h1>Estado</h1>

                    {evento ? (
                        <>
                            <p>
                                {evento.listos}/{evento.total} listos · evento: {evento.estado}
                            </p>

                            {evento.estado === "abierto" && (
                                evento.listo_yo ? (
                                    <p>Ya estás listo ✅</p>
                                ) : (
                                    <Button type="button" disabled={marcando} onClick={marcarListo}>
                                        {marcando ? "Marcando…" : "Marcar como listo"}
                                    </Button>
                                )
                            )}
                        </>
                    ) : (
                        <p>Cargando…</p>
                    )}

                </Card>

                <Card>

                    <h1>Pregunta del amigo invisible</h1>

                    {pregunta === null ? (
                        <p>
                            De momento no te ha preguntado nada.
                        </p>
                    ) : (
                        <>
                            <p className="pregunta">
                                {pregunta.texto}
                            </p>

                            {pregunta.respondida_at ? (
                                <p className="respuesta">
                                    {pregunta.respuesta ?? respuesta}
                                </p>
                            ) : (
                                <form onSubmit={responderPregunta}>

                                    <input
                                        type="text"
                                        placeholder="Escribe tu respuesta"
                                        value={respuesta}
                                        onChange={(e) => setRespuesta(e.target.value)}
                                        required
                                    />

                                    <Button disabled={respondiendo}>
                                        {respondiendo ? "Enviando…" : "Enviar"}
                                    </Button>

                                </form>
                            )}
                        </>
                    )}

                </Card>

            </div>

            <NavBar activePage="perfil" />

        </main>
    );
}
