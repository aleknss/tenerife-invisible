"use client";

import { useEffect, useState } from "react";
import { Activity, Users, Settings, Ban, UserPlus, Trash2, Pencil, KeyRound } from "lucide-react";
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
    const [limpiando, setLimpiando] = useState(false);
    const [guardandoConfig, setGuardandoConfig] = useState(false);
    const [guardandoVetos, setGuardandoVetos] = useState(false);
    const [vetos, setVetos] = useState([]);
    const [metricas, setMetricas] = useState(null);

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

    async function recargarVetos() {
        const res = await fetch("/api/admin/vetos");
        if (res.ok) {
            setVetos(await res.json());
        }
    }

    async function recargarMetricas() {
        const res = await fetch("/api/admin/metricas");
        if (res.ok) {
            setMetricas(await res.json());
        }
    }

    useEffect(() => {
        recargarVetos();
        recargarMetricas();
    }, []);

    function nombreDe(id) {
        return participantes.find((p) => p.id === id)?.nombre ?? "?";
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
            await recargarMetricas();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setCreando(false);
        }
    }

    async function borrarUsuario(p) {
        if (!window.confirm(`¿Seguro que borras a ${p.nombre}? Esto no se puede deshacer, chiquillo.`)) {
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
            await recargarMetricas();
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    async function renombrarUsuario(p) {

        const nombre = window.prompt(`Nuevo nombre para ${p.nombre}`, p.nombre);
        if (nombre === null) {
            return;
        }

        const limpio = nombre.trim();
        if (!limpio || limpio === p.nombre) {
            return;
        }

        setMensaje("");
        setError("");

        try {
            const res = await fetch(`/api/users/${p.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre: limpio })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo renombrar");
                return;
            }

            setMensaje(`Usuario renombrado a ${limpio}`);
            await recargarParticipantes();
            await recargarVetos();
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    async function resetearPassword(p) {

        const password = window.prompt(`Nueva contraseña para ${p.nombre} (mín. 6)`, "");
        if (password === null) {
            return;
        }
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setMensaje("");
        setError("");

        try {
            const res = await fetch(`/api/users/${p.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo cambiar la contraseña");
                return;
            }

            setMensaje(`Contraseña de ${p.nombre} actualizada`);
        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
    }

    async function darPreguntaExtra(p, destino) {

        const destinatario =
            destino === "amigo" ? `el chacho invisible de ${p.nombre}` : p.nombre;

        if (!window.confirm(`¿Añadir una pregunta extra a ${destinatario}?`)) {
            return;
        }
        if (
            !window.confirm(
                `¿Seguro? ${destinatario} tendrá una pregunta más y esta acción no se puede deshacer.`
            )
        ) {
            return;
        }

        setMensaje("");
        setError("");

        try {
            const res = await fetch("/api/admin/pregunta-extra", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario_id: p.id, destino })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo añadir la pregunta");
                return;
            }

            const nombre = datos.nombre ?? p.nombre;
            setMensaje(`${nombre} tiene ahora ${datos.preguntas_extra} pregunta(s) extra`);
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
        await recargarVetos();
        await recargarMetricas();
        setGuardandoVetos(false);
    }

    async function quitarVeto(veto) {

        const [a_id, b_id] = veto;

        if (
            !window.confirm(
                `¿Quitar la exclusión "${nombreDe(a_id)} no puede regalar a ${nombreDe(b_id)}"?`
            )
        ) {
            return;
        }

        setMensaje("");
        setError("");

        try {

            const res = await fetch("/api/admin/vetos", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ a_id, b_id })
            });

            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo quitar la exclusión");
                return;
            }

            setMensaje("Exclusión eliminada");
            await recargarVetos();
            await recargarMetricas();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        }
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
            await recargarMetricas();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setSorteando(false);
        }
    }

    async function limpiarSorteo() {

        if (
            !window.confirm(
                "¿Deshacer el sorteo? Se borran asignaciones, marcas de visto y todas las preguntas anónimas. Esto no hay quien lo deshaga."
            )
        ) {
            return;
        }

        setMensaje("");
        setError("");
        setLimpiando(true);

        try {

            const res = await fetch("/api/admin/sortear", { method: "DELETE" });
            const datos = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(datos.error ?? "No se pudo limpiar el sorteo");
                return;
            }

            setMensaje("Sorteo deshecho");
            await recargarEstado();
            await recargarMetricas();

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setLimpiando(false);
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
                    precio_min: aNumero(config.precio_min),
                    precio_max: aNumero(config.precio_max),
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
                            <p className="estado-badge">{estado.estado}</p>

                            {metricas && (
                                <>
                                    <p>Exclusiones: {metricas.exclusiones}</p>

                                    {estado.estado === "sorteado" && (
                                        <>
                                            <p>
                                                Vistos: {metricas.vistos}/{metricas.total}
                                            </p>
                                            <p>Preguntas: {metricas.preguntas}</p>

                                            {metricas.asignados < metricas.total && (
                                                <p className="page-alert page-alert-error">
                                                    Asignados: {metricas.asignados}/{metricas.total}
                                                </p>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <p>Achuchando…</p>
                    )}

                    <Button type="button" onClick={sortearAhora} disabled={sorteando}>
                        {sorteando ? "Sorteando…" : "Sortear"}
                    </Button>

                    <Button type="button" onClick={limpiarSorteo} disabled={limpiando}>
                        {limpiando ? "Limpiando…" : "Limpiar sorteo"}
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

                                <span className="row-actions">
                                    <button
                                        type="button"
                                        className="icon-btn neutral"
                                        onClick={() => renombrarUsuario(p)}
                                        aria-label={`Renombrar ${p.nombre}`}
                                        title="Renombrar"
                                    >
                                        <Pencil size={16} />
                                    </button>

                                    <button
                                        type="button"
                                        className="icon-btn neutral"
                                        onClick={() => resetearPassword(p)}
                                        aria-label={`Cambiar contraseña de ${p.nombre}`}
                                        title="Cambiar contraseña"
                                    >
                                        <KeyRound size={16} />
                                    </button>

                                    <select
                                        className="icon-btn neutral"
                                        value=""
                                        onChange={(e) => darPreguntaExtra(p, e.target.value)}
                                        aria-label={`Añadir pregunta extra a ${p.nombre} o a su chacho invisible`}
                                        title="+1 pregunta"
                                    >
                                        <option value="" disabled>+1 pregunta</option>
                                        <option value="persona">A {p.nombre}</option>
                                        <option value="amigo">A su chacho invisible</option>
                                    </select>

                                    <button
                                        type="button"
                                        className="icon-btn"
                                        onClick={() => borrarUsuario(p)}
                                        aria-label={`Borrar ${p.nombre}`}
                                        title="Borrar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </span>
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
                                    <span>Precio mín.</span>
                                    <input
                                        type="number"
                                        placeholder="15"
                                        value={config.precio_min ?? ""}
                                        onChange={(e) => cambiarConfig("precio_min", e.target.value)}
                                    />
                                </label>

                                <label className="field">
                                    <span>Precio máx.</span>
                                    <input
                                        type="number"
                                        placeholder="20"
                                        value={config.precio_max ?? ""}
                                        onChange={(e) => cambiarConfig("precio_max", e.target.value)}
                                    />
                                </label>
                            </div>

                            <label className="field">
                                <span>Moneda</span>
                                <input
                                    type="text"
                                    placeholder="EUR"
                                    value={config.moneda ?? ""}
                                    onChange={(e) => cambiarConfig("moneda", e.target.value)}
                                />
                            </label>

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

                    <ul className="participantes-lista">
                        {vetos.length === 0 && (
                            <li className="participantes-vacio">Sin exclusiones</li>
                        )}

                        {vetos.map((veto) => (
                            <li key={`${veto[0]}-${veto[1]}`}>
                                <span>
                                    {nombreDe(veto[0])} no puede regalar a {nombreDe(veto[1])}
                                </span>

                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => quitarVeto(veto)}
                                    aria-label="Quitar exclusión"
                                    title="Quitar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>

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
                                no puede regalar a
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

                    {exclusiones.length > 0 && (
                        <div className="exclusions-list">
                            {exclusiones.map((exclusion) => (
                                <p key={`${exclusion.a_id}-${exclusion.b_id}`}>
                                    {exclusion.nombre1} no puede regalar a {exclusion.nombre2} · sin guardar
                                </p>
                            ))}

                            <Button type="button" onClick={confirmarExclusiones} disabled={guardandoVetos}>
                                {guardandoVetos ? "Guardando…" : "Confirmar"}
                            </Button>
                        </div>
                    )}

                </Card>

            </div>

        </main>
    );
}
