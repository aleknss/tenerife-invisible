"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/Button/Button";
import "./Creditos.css";

export default function Creditos() {
    const [abierto, setAbierto] = useState(false);

    useEffect(() => {
        function abrir() {
            setAbierto(true);
        }
        window.addEventListener("creditos:abrir", abrir);
        return () => window.removeEventListener("creditos:abrir", abrir);
    }, []);

    useEffect(() => {
        if (!abierto) {
            return;
        }
        function alPulsar(e) {
            if (e.key === "Escape") {
                setAbierto(false);
            }
        }
        window.addEventListener("keydown", alPulsar);
        return () => window.removeEventListener("keydown", alPulsar);
    }, [abierto]);

    if (!abierto) {
        return null;
    }

    return (
        <div
            className="creditos-overlay"
            onClick={() => setAbierto(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Créditos"
        >
            <div className="creditos-card" onClick={(e) => e.stopPropagation()}>
                <Image
                    src="/devs.jpg"
                    alt="Los desarrolladores"
                    width={120}
                    height={120}
                    className="creditos-foto"
                />

                <h2>Chacho Invisible</h2>
                <p>Hecho con cariño por</p>
                <p className="creditos-nombres">Alek &amp; JJ</p>

                <Button type="button" onClick={() => setAbierto(false)}>
                    Cerrar
                </Button>
            </div>
        </div>
    );
}
