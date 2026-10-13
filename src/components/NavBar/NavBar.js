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
    const comprobado = useRef(false);

    useEffect(() => {
        if (pathname === "/" || comprobado.current) {
            return;
        }

        comprobado.current = true;

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
    }, [pathname]);

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

            <Link
                href="/regalo"
                className={`navbar-item ${activePage === "regalo" ? "active" : ""}`}
            >
                <Gift className="navbar-icon" size={22} />
                <span>Regalo</span>
            </Link>

            <Link
                href="/grupo"
                className={`navbar-item ${activePage === "grupo" ? "active" : ""}`}
            >
                <Users className="navbar-icon" size={22} />
                <span>Grupo</span>
            </Link>

            <Link
                href="/perfil"
                className={`navbar-item ${activePage === "perfil" ? "active" : ""}`}
            >
                <User className="navbar-icon" size={22} />
                <span>Perfil</span>
            </Link>

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
