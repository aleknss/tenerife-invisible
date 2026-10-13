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

    useEffect(() => {
        cargarNombres();
    }, []);

    async function cargarNombres() {

        try {

            const respuesta = await fetch("/api/grupo/participantes");

            if (!respuesta.ok) {
                throw new Error("Error al obtener los participantes");
            }

            const datos = await respuesta.json();

            setParticipantes(datos);

        } catch (error) {
            console.error("Error:", error);
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

        } catch (error) {
            console.error("Error:", error);
        }
    }

    return (
        <main className="admin-page">

            <Card>

                <h1>Administración</h1>

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
<NavBar activePage="admin" />
        </main>
    );
}