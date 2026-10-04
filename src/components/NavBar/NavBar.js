"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "./NavBar.css";

export default function NavBar({ activePage = "grupo" }) {

    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        comprobarAdmin();
    }, []);

    function comprobarAdmin() {
        //logica de api aqui  
        const admin = true;

        setIsAdmin(admin);
    }

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