"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./admin.css";
import NavBar from "@/components/NavBar/NavBar";

export default function Admin() {

    const [nombres, setNombres] = useState([]);

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

            setNombres(datos);

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

        setExclusiones([
            ...exclusiones,
            {
                persona1: persona1,
                persona2: persona2
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

        console.log("Enviando a la BDD:", exclusiones);

        // to do mandar a bdd

        setExclusiones([]);
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

                            {nombres.map((nombre) => (
                                <option key={nombre} value={nombre}>
                                    {nombre}
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

                            {nombres.map((nombre) => (
                                <option key={nombre} value={nombre}>
                                    {nombre}
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
                            {exclusion.persona1} no puede tocar a{" "}
                            {exclusion.persona2}
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