"use client";

import { useState } from "react";
import { Activity, Users, Settings, Ban, UserPlus, Trash2 } from "lucide-react";
import Markdown from "@/components/Markdown/Markdown";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./admin.css";

export default function AdminClient({ participantesIniciales, estadoInicial, configInicial }) {

    const [participantes, setParticipantes] = useState(participantesIniciales ?? []);

    const [exclusiones, setExclusiones] = useState([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);

    const [persona1, setPersona1] = useState("");
    const [persona2, setPersona2] = useState("");

    const [estado, setEstado] = useState(estadoInicial ?? null);
    const [config, setConfig] = useState(configInicial ?? null);

    const [nuevoNombre, setNuevoNombre] = useState("");
    const [nuevoPassword, setNuevoPassword] = useState("");
    const [nuevoRole, setNuevoRole] = useState("user");
    const [creando, setCreando] = useState(false);
    const [sorteando, setSorteando] = useState(false);
    const [guardandoConfig, setGuardandoConfig] = useState(false);
    const [guardandoVetos, setGuardandoVetos] = useState(false);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    async function recargarEstado() {
        const res = await fetch("/api/estado");
        if (res.ok) {
            setEstado(await res.json());
        }
    }

    async function recargarParticipantes() {
        const res = await fetch("/api/grupo/participantes");
        if (res.ok) {
            setParticipantes(await res.json());
        }
    }

    async function crearUsuario(e) {

        e.preventDefault();

        setMensaje("");
        setError("");

        if (!nuevoNombre.trim() || !nuevoPassword) {
            setError("Nombre y contraseña requeridos");
            return;
        }

        setCreando(true);

        try {

            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nombre: nuevoNombre.trim(),
                    password: nuevoPassword,
                    role: nuevoRole
                })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo crear el usuario");
                return;
            }

            setNuevoNombre("");
            setNuevoPassword("");
            setNuevoRole("user");
            setMensaje(`Usuario ${datos.nombre} creado`);
            await recargarParticipantes();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setCreando(false);
        }
    }

    async function borrarUsuario(p) {
        if (!window.confirm(`¿Borrar a ${p.nombre}? Esta acción no se puede deshacer.`)) {
            return;
        }

        setMensaje("");
        setError("");

        try {
            const res = await fetch(`/api/users/${p.id}`, { method: "DELETE" });
            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo borrar el usuario");
                return;
            }

            setMensaje(`Usuario ${p.nombre} borrado`);
            await recargarParticipantes();
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
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
        setGuardandoVetos(true);

        for (let i = 0; i < exclusiones.length; i++) {

            const exclusion = exclusiones[i];

            try {

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
            } catch (err) {
                console.error("Error:", err);
                setError("No se pudieron guardar todas las exclusiones");
                setExclusiones(exclusiones.slice(i));
                setGuardandoVetos(false);
                return;
            }
        }

        setExclusiones([]);
        setMensaje("Exclusiones guardadas");
        setGuardandoVetos(false);
    }

    async function sortearAhora() {

        setMensaje("");
        setError("");
        setSorteando(true);

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
        } finally {
            setSorteando(false);
        }
    }

    function cambiarConfig(campo, valor) {
        setConfig((prev) => ({ ...prev, [campo]: valor }));
    }

    async function guardarConfig(e) {

        e.preventDefault();

        setMensaje("");
        setError("");
        setGuardandoConfig(true);

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
        } finally {
            setGuardandoConfig(false);
        }
    }

    return (
        <main className="app-page">

            <div className="app-stack">

                {(mensaje || error) && (
                    <div
                        className={`page-alert ${error ? "page-alert-error" : ""}`}
                        role={error ? "alert" : "status"}
                    >
                        {error || mensaje}
                    </div>
                )}

                <Card>

                    <h1><Activity size={22} /> Estado</h1>

                    {estado ? (
                        <>
                            <p className="estado-num">
                                {estado.listos}<span>/{estado.total}</span>
                            </p>
                            <p className="estado-badge">{estado.estado}</p>
                        </>
                    ) : (
                        <p>Cargando…</p>
                    )}

                    <Button type="button" onClick={sortearAhora} disabled={sorteando}>
                        {sorteando ? "Sorteando…" : "Sortear"}
                    </Button>

                </Card>

                <Card>

                    <h1><Users size={22} /> Participantes</h1>

                    <p className="estado-num">{participantes.length}</p>

                    <ul className="participantes-lista">
                        {participantes.length === 0 && (
                            <li className="participantes-vacio">Sin participantes</li>
                        )}

                        {participantes.map((p) => (
                            <li key={p.id}>
                                <span>{p.nombre}</span>

                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => borrarUsuario(p)}
                                    aria-label={`Borrar ${p.nombre}`}
                                    title="Borrar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>

                    <h2><UserPlus size={15} /> Añadir participante</h2>

                    <form onSubmit={crearUsuario} className="config-form">

                        <label className="field">
                            <span>Nombre</span>
                            <input
                                type="text"
                                placeholder="Nombre"
                                value={nuevoNombre}
                                onChange={(e) => setNuevoNombre(e.target.value)}
                            />
                        </label>

                        <label className="field">
                            <span>Contraseña</span>
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={nuevoPassword}
                                onChange={(e) => setNuevoPassword(e.target.value)}
                            />
                        </label>

                        <label className="field">
                            <span>Rol</span>
                            <select
                                value={nuevoRole}
                                onChange={(e) => setNuevoRole(e.target.value)}
                            >
                                <option value="user">user</option>
                                <option value="admin">admin</option>
                            </select>
                        </label>

                        <Button type="submit" disabled={creando}>
                            {creando ? "Creando…" : "Crear participante"}
                        </Button>

                    </form>

                </Card>

                <Card>

                    <h1><Settings size={22} /> Configuración del evento</h1>

                    {config && (
                        <form onSubmit={guardarConfig} className="config-form">

                            <label className="field">
                                <span>Nombre</span>
                                <input
                                    type="text"
                                    placeholder="Nombre del evento"
                                    value={config.nombre ?? ""}
                                    onChange={(e) => cambiarConfig("nombre", e.target.value)}
                                />
                            </label>

                            <div className="field-row">
                                <label className="field">
                                    <span>Precio</span>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={config.precio ?? ""}
                                        onChange={(e) => cambiarConfig("precio", e.target.value)}
                                    />
                                </label>

                                <label className="field">
                                    <span>Moneda</span>
                                    <input
                                        type="text"
                                        placeholder="EUR"
                                        value={config.moneda ?? ""}
                                        onChange={(e) => cambiarConfig("moneda", e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className="field">
                                <span>Fecha de entrega</span>
                                <input
                                    type="date"
                                    value={config.fecha_entrega ?? ""}
                                    onChange={(e) => cambiarConfig("fecha_entrega", e.target.value)}
                                />
                            </label>

                            <label className="field">
                                <span>Reglas (Markdown)</span>
                                <div className="markdown-editor">
                                    <textarea
                                        placeholder={"# Título\n- punto\n**negrita** `código`"}
                                        value={config.reglas ?? ""}
                                        onChange={(e) => cambiarConfig("reglas", e.target.value)}
                                    />
                                    <div className="markdown-preview markdown-body">
                                        {config.reglas ? (
                                            <Markdown>{config.reglas}</Markdown>
                                        ) : (
                                            <p className="markdown-placeholder">Vista previa</p>
                                        )}
                                    </div>
                                </div>
                            </label>

                            <Button type="submit" disabled={guardandoConfig}>
                                {guardandoConfig ? "Guardando…" : "Guardar configuración"}
                            </Button>

                        </form>
                    )}

                </Card>

                <Card>

                    <h1><Ban size={22} /> Exclusiones</h1>

                    {!mostrarFormulario && (
                        <Button type="button" onClick={() => setMostrarFormulario(true)}>
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

                            <Button type="button" onClick={añadirExclusion}>
                                Añadir
                            </Button>

                        </div>
                    )}

                    <div className="exclusions-list">
                        {exclusiones.map((exclusion) => (
                            <p key={`${exclusion.a_id}-${exclusion.b_id}`}>
                                {exclusion.nombre1} no puede tocar a{" "}
                                {exclusion.nombre2}
                            </p>
                        ))}
                    </div>

                    {exclusiones.length > 0 && (
                        <Button type="button" onClick={confirmarExclusiones} disabled={guardandoVetos}>
                            {guardandoVetos ? "Guardando…" : "Confirmar"}
                        </Button>
                    )}

                </Card>

            </div>

        </main>
    );
}
