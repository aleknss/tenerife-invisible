"use client";

import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";

export default function Error({ reset }) {
    return (
        <main className="app-page">
            <div className="app-stack">
                <Card>
                    <h1>Algo ha ido mal</h1>
                    <p>No se pudo cargar la página.</p>
                    <Button type="button" onClick={() => reset()}>
                        Reintentar
                    </Button>
                </Card>
            </div>
        </main>
    );
}
