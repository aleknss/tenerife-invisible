"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./admin.css";
import NavBar from "@/components/NavBar/NavBar";

export default function Admin() {

    const [participantes, setParticipantes] = useState([]);

    const [exclusiones, setExclusiones] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [persona1, setPersona1] = useState("");
    const [persona2, setPersona2] = useState("");

    const [estado, setEstado] = useState(null);
    const [config, setConfig] = useState(null);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        async function cargar() {

            try {

                const [participantesRes, estadoRes, configRes] = await Promise.all([
                    fetch("/api/grupo/participantes"),
                    fetch("/api/estado"),
                    fetch("/api/config")
                ]);

                if (participantesRes.ok) {
                    setParticipantes(await participantesRes.json());
                }
                if (estadoRes.ok) {
                    setEstado(await estadoRes.json());
                }
                if (configRes.ok) {
                    setConfig(await configRes.json());
                }

            } catch (err) {
                console.error("Error:", err);
                setError("No se pudo cargar la administración");
            }
        }

        cargar();
    }, []);

    async function recargarEstado() {
        const res = await fetch("/api/estado");
        if (res.ok) {
            setEstado(await res.json());
        }
    }

    function añadirExclusion() {

        if (persona1 === "" || persona2 === "") {
            return;
        }

        if (persona1 === persona2) {
            return;
        }

        const p1 = participantes.find((p) => p.id === persona1);
        const p2 = participantes.find((p) => p.id === persona2);

        if (!p1 || !p2) {
            return;
        }

        setExclusiones([
            ...exclusiones,
            {
                a_id: p1.id,
                b_id: p2.id,
                nombre1: p1.nombre,
                nombre2: p2.nombre
            }
        ]);

        setPersona1("");
        setPersona2("");
        setMostrarFormulario(false);
    }

    async function confirmarExclusiones() {

        if (exclusiones.length === 0) {
            return;
        }

        setMensaje("");
        setError("");

        try {

            for (const exclusion of exclusiones) {

                const respuesta = await fetch("/api/admin/vetos", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        a_id: exclusion.a_id,
                        b_id: exclusion.b_id
                    })
                });

                if (!respuesta.ok) {
                    throw new Error("Error al guardar la exclusión");
                }
            }

            setExclusiones([]);
            setMensaje("Exclusiones guardadas");

        } catch (err) {
            console.error("Error:", err);
            setError("No se pudieron guardar las exclusiones");
        }
    }

    async function sortearAhora() {

        setMensaje("");
        setError("");

        try {

            const res = await fetch("/api/admin/sortear", { method: "POST" });
            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(
                    datos.bloqueado
                        ? `${datos.error} (${datos.bloqueado})`
                        : datos.error ?? "No se pudo sortear"
                );
                return;
            }

            setMensaje("Sorteo realizado");
            await recargarEstado();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    function cambiarConfig(campo, valor) {
        setConfig((prev) => ({ ...prev, [campo]: valor }));
    }

    async function guardarConfig(e) {

        e.preventDefault();

        setMensaje("");
        setError("");

        function aNumero(valor) {
            return valor === "" || valor == null ? null : Number(valor);
        }

        try {

            const res = await fetch("/api/config", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: config.nombre,
                    precio: aNumero(config.precio),
                    moneda: config.moneda,
                    fecha_entrega: config.fecha_entrega || null,
                    tematica: config.tematica,
                    metodo_entrega: config.metodo_entrega,
                    umbral_listos: aNumero(config.umbral_listos),
                    reglas: config.reglas
                })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo guardar la configuración");
                return;
            }

            setConfig(datos);
            setMensaje("Configuración guardada");
            await recargarEstado();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    return (
        <main className="admin-page">

            <div className="admin-cards">

                <Card>

                    <h1>Administración</h1>

                    {mensaje && <p role="status">{mensaje}</p>}
                    {error && <p className="admin-error" role="alert">{error}</p>}

                    <h2>Estado</h2>
                    {estado ? (
                        <p>
                            {estado.listos}/{estado.total} listos · evento: {estado.estado}
                            {estado.umbral_listos != null && ` · umbral: ${estado.umbral_listos}`}
                        </p>
                    ) : (
                        <p>Cargando…</p>
                    )}

                    <Button onClick={sortearAhora}>
                        Sortear
                    </Button>

                </Card>

                <Card>

                    <h2>Configuración del evento</h2>

                    {config && (
                        <form onSubmit={guardarConfig} className="config-form">

                            <input
                                type="text"
                                placeholder="Nombre del evento"
                                value={config.nombre ?? ""}
                                onChange={(e) => cambiarConfig("nombre", e.target.value)}
                            />

                            <input
                                type="number"
                                placeholder="Precio"
                                value={config.precio ?? ""}
                                onChange={(e) => cambiarConfig("precio", e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Moneda"
                                value={config.moneda ?? ""}
                                onChange={(e) => cambiarConfig("moneda", e.target.value)}
                            />

                            <input
                                type="date"
                                value={config.fecha_entrega ?? ""}
                                onChange={(e) => cambiarConfig("fecha_entrega", e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Temática"
                                value={config.tematica ?? ""}
                                onChange={(e) => cambiarConfig("tematica", e.target.value)}
                            />

                            <input
                                type="text"
                                placeholder="Método de entrega"
                                value={config.metodo_entrega ?? ""}
                                onChange={(e) => cambiarConfig("metodo_entrega", e.target.value)}
                            />

                            <input
                                type="number"
                                placeholder="Umbral de listos"
                                value={config.umbral_listos ?? ""}
                                onChange={(e) => cambiarConfig("umbral_listos", e.target.value)}
                            />

                            <textarea
                                placeholder="Reglas"
                                value={config.reglas ?? ""}
                                onChange={(e) => cambiarConfig("reglas", e.target.value)}
                            />

                            <Button>
                                Guardar configuración
                            </Button>

                        </form>
                    )}

                </Card>

                <Card>

                    <h2>Exclusiones</h2>

                    {!mostrarFormulario && (
                        <Button onClick={() => setMostrarFormulario(true)}>
                            Añadir exclusión
                        </Button>
                    )}

                    {mostrarFormulario && (
                        <div className="exclusion-form">

                            <select
                                value={persona1}
                                onChange={(e) => setPersona1(e.target.value)}
                            >
                                <option value="">
                                    Selecciona una persona
                                </option>

                                {participantes.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre}
                                    </option>
                                ))}
                            </select>

                            <span>
                                no puede tocar a
                            </span>

                            <select
                                value={persona2}
                                onChange={(e) => setPersona2(e.target.value)}
                            >
                                <option value="">
                                    Selecciona una persona
                                </option>

                                {participantes.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.nombre}
                                    </option>
                                ))}
                            </select>

                            <Button onClick={añadirExclusion}>
                                Añadir
                            </Button>

                        </div>
                    )}

                    <div className="exclusions-list">
                        {exclusiones.map((exclusion, index) => (
                            <p key={index}>
                                {exclusion.nombre1} no puede tocar a{" "}
                                {exclusion.nombre2}
                            </p>
                        ))}
                    </div>

                    {exclusiones.length > 0 && (
                        <Button onClick={confirmarExclusiones}>
                            Confirmar
                        </Button>
                    )}

                </Card>

            </div>

            <NavBar activePage="admin" />
        </main>
    );
}
