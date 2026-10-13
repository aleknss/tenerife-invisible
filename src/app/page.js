"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";

export default function Home() {

    const router = useRouter();

    const [nombre, setNombre] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [cargando, setCargando] = useState(false);

    async function iniciarSesion(e) {

        e.preventDefault();

        if (cargando) {
            return;
        }

        setError("");
        setCargando(true);

        try {

            const respuesta = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre, password })
            });

            const datos = await respuesta.json().catch(() => ({}));

            if (!respuesta.ok) {
                setError(datos.error ?? "No se pudo iniciar sesión");
                return;
            }

            router.push(datos.role === "admin" ? "/admin" : "/grupo");

        } catch (err) {
            console.error("Error:", err);
            setError("Error de conexión");
        } finally {
            setCargando(false);
        }
    }

    return (
        <main>

            <Card>

                <h1>Chacho Invisible</h1>

                <form onSubmit={iniciarSesion}>

                    <input
                        type="text"
                        placeholder="Nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        autoComplete="username"
                        required
                    />

                    <input
                        type="password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />

                    {error && (
                        <p className="login-error" role="alert">
                            {error}
                        </p>
                    )}

                    <Button>
                        {cargando ? "Entrando…" : "Entrar"}
                    </Button>

                </form>

            </Card>

        </main>
    );
}
