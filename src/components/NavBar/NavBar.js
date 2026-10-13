"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./NavBar.css";

export default function NavBar({ activePage = "grupo" }) {

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        async function comprobarAdmin() {
            try {
                const respuesta = await fetch("/api/me");
                if (!respuesta.ok) {
                    return;
                }
                const datos = await respuesta.json();
                setIsAdmin(datos.role === "admin");
            } catch (error) {
                console.error("Error:", error);
            }
        }

        comprobarAdmin();
    }, []);

    return (
        <nav className="navbar">

            <Link
                href="/regalo"
                className={`navbar-item ${activePage === "regalo" ? "active" : ""}`}
            >
                <span className="navbar-icon">🎁</span>
                <span>Regalo</span>
            </Link>

            <Link
                href="/grupo"
                className={`navbar-item ${activePage === "grupo" ? "active" : ""}`}
            >
                <span className="navbar-icon">👥</span>
                <span>Grupo</span>
            </Link>

            <Link
                href="/perfil"
                className={`navbar-item ${activePage === "perfil" ? "active" : ""}`}
            >
                <span className="navbar-icon">👤</span>
                <span>Perfil</span>
            </Link>

            {isAdmin && (
                <Link
                    href="/admin"
                    className={`navbar-item ${activePage === "admin" ? "active" : ""}`}
                >
                    <span className="navbar-icon">⚙️</span>
                    <span>Admin</span>
                </Link>
            )}

        </nav>
    );
}