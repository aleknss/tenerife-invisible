"use client";

import { useEffect, useRef, useState } from "react";

const TOQUES = 3;
const VENTANA = 1200;

export default function CuentaAtras({ fecha }) {

    const [restante, setRestante] = useState(null);
    const cuenta = useRef(0);
    const temporizador = useRef(null);

    useEffect(() => {
        if (!fecha) {
            return;
        }

        const objetivo = new Date(`${fecha}T00:00:00`).getTime();

        function tick() {
            setRestante(objetivo - Date.now());
        }

        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [fecha]);

    function alClic() {
        cuenta.current += 1;

        if (temporizador.current) {
            clearTimeout(temporizador.current);
        }

        if (cuenta.current >= TOQUES) {
            cuenta.current = 0;
            window.dispatchEvent(new Event("creditos:abrir"));
            return;
        }

        temporizador.current = setTimeout(() => {
            cuenta.current = 0;
        }, VENTANA);
    }

    if (restante === null) {
        return null;
    }

    if (restante <= 0) {
        return (
            <p className="cuenta" onClick={alClic}>
                ¡Hoy es el día! 🎁
            </p>
        );
    }

    const seg = Math.floor(restante / 1000);
    const partes = [
        { v: Math.floor(seg / 86400), u: "d" },
        { v: Math.floor((seg % 86400) / 3600), u: "h" },
        { v: Math.floor((seg % 3600) / 60), u: "m" },
        { v: seg % 60, u: "s" },
    ];

    return (
        <div className="cuenta" role="timer" aria-live="off" onClick={alClic}>
            {partes.map(({ v, u }) => (
                <span key={u} className="cuenta-bloque">
                    <strong>{v}</strong>
                    {u}
                </span>
            ))}
        </div>
    );
}
