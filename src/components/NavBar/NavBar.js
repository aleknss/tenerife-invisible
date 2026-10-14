"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Gift, Users, User, Settings, LogOut } from "lucide-react";
import "./NavBar.css";

export default function NavBar() {

    const router = useRouter();
    const pathname = usePathname();
    const activePage = pathname.split("/")[1] || "";

    const [isAdmin, setIsAdmin] = useState(false);
    const [pendiente, setPendiente] = useState(false);
    const comprobado = useRef(false);

    useEffect(() => {
        if (pathname === "/" || comprobado.current) {
            return;
        }

        comprobado.current = true;

        async function comprobar() {
            try {
                const [meRes, asignadoRes] = await Promise.all([
                    fetch("/api/me"),
                    fetch("/api/me/asignado"),
                ]);

                if (meRes.ok) {
                    const datos = await meRes.json();
                    setIsAdmin(datos.role === "admin");
                }

                if (asignadoRes.ok) {
                    const datos = await asignadoRes.json();
                    setPendiente(Boolean(datos.asignado) && !datos.viewed_at);
                }
            } catch (error) {
                console.error("Error:", error);
            }
        }

        comprobar();
    }, [pathname]);

    useEffect(() => {
        function visto() {
            setPendiente(false);
        }

        window.addEventListener("regalo-visto", visto);
        return () => window.removeEventListener("regalo-visto", visto);
    }, []);

    async function cerrarSesion() {
        try {
            await fetch("/api/logout", { method: "POST" });
        } catch (error) {
            console.error("Error:", error);
        }
        comprobado.current = false;
        setIsAdmin(false);
        router.replace("/");
    }

    if (pathname === "/") {
        return null;
    }

    return (
        <nav className="navbar">

            {!isAdmin && (
                <>
                    <Link
                        href="/regalo"
                        className={`navbar-item ${activePage === "regalo" ? "active" : ""}`}
                    >
                        <span className="navbar-icon-wrap">
                            <Gift className="navbar-icon" size={22} />
                            {pendiente && <span className="navbar-dot" />}
                        </span>
                        <span>Mi regalo</span>
                    </Link>

                    <Link
                        href="/grupo"
                        className={`navbar-item ${activePage === "grupo" ? "active" : ""}`}
                    >
                        <Users className="navbar-icon" size={22} />
                        <span>Peña</span>
                    </Link>

                    <Link
                        href="/perfil"
                        className={`navbar-item ${activePage === "perfil" ? "active" : ""}`}
                    >
                        <User className="navbar-icon" size={22} />
                        <span>Mi ficha</span>
                    </Link>
                </>
            )}

            {isAdmin && (
                <Link
                    href="/admin"
                    className={`navbar-item ${activePage === "admin" ? "active" : ""}`}
                >
                    <Settings className="navbar-icon" size={22} />
                    <span>Admin</span>
                </Link>
            )}

            <button
                type="button"
                className="navbar-item"
                onClick={cerrarSesion}
            >
                <LogOut className="navbar-icon" size={22} />
                <span>Salir</span>
            </button>

        </nav>
    );
}
