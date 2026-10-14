"use client";

import { useEffect, useState } from "react";
import "./EasterEggRioja.css";

const SECRET = "rioja";
const COLORES = ["#7B1E2B", "#9E2B3A", "#D9552B", "#E0A93B", "#2E7D4F"];

export default function EasterEggRioja() {
    const [activo, setActivo] = useState(false);

    useEffect(() => {
        let buffer = "";

        function alTeclear(e) {
            if (e.key.length !== 1) {
                return;
            }
            buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
            if (buffer === SECRET) {
                buffer = "";
                setActivo(true);
            }
        }

        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, []);

    useEffect(() => {
        if (!activo) {
            return;
        }
        const id = setTimeout(() => setActivo(false), 4500);
        return () => clearTimeout(id);
    }, [activo]);

    if (!activo) {
        return null;
    }

    const piezas = Array.from({ length: 40 }).map((_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duracion: 2 + Math.random() * 1.5,
        color: COLORES[i % COLORES.length],
    }));

    return (
        <div className="rioja-overlay" role="status" aria-live="polite">
            <div className="rioja-confeti" aria-hidden="true">
                {piezas.map((p, i) => (
                    <span
                        key={i}
                        className="rioja-pieza"
                        style={{
                            left: `${p.left}%`,
                            backgroundColor: p.color,
                            animationDelay: `${p.delay}s`,
                            animationDuration: `${p.duracion}s`,
                        }}
                    />
                ))}
            </div>

            <div className="rioja-toast">🍷 ¡Un brindis por La Rioja!</div>
        </div>
    );
}
