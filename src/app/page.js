"use client";

import Card from "@/components/Card/Card";
import { useRouter } from "next/navigation";
import Button from "@/components/Button/Button";

export default function Home() {

    const router = useRouter();

  

    function iniciarSesion() {
      //  logica de api aqui validar credencial
          router.push("/perfil");
        console.log("Iniciando sesión...");
    }

    return (
        <main>

            <Card>

                <h1>Chacho Invisible</h1>

         

                <input
                    type="text"
                    placeholder="Nombre"
                />

                <input
                    type="password"
                    placeholder="Contraseña"
                />

                <Button onClick={iniciarSesion}>
                    Entrar
                </Button>

            </Card>

        </main>
    );
}