"use client";

import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import NavBar from "@/components/NavBar/NavBar";
import "./regalo.css";

export default function Regalo() {

    const amigo = getInfo();

    if (amigo === null) {
        return (
            <main className="regalo-page">

                <div className="regalo-cards">

                    <Card>
                        <h1>Tu amigo invisible</h1>

                        <p>
                            Todavía no se han elegido las parejas.
                        </p>
                    </Card>

                </div>

                <NavBar activePage="regalo" />

            </main>
        );
    }

    const respuesta = getRespuesta();

    function getInfo() {
        // api bla bla bla
        //devilvemos null si no hay parejas todavia

        return {
            nombre: "Javier",
            gustos: ["Videojuegos", "Anime", "Fútbol"],
            vetado: "Calcetines",
            tallas: {
                camisa: "M",
                pantalon: "42",
                zapatos: "43"
            }
        };
    }

    function getRespuesta() {
        return "";
    }

    function enviarMensaje(e) {
        e.preventDefault();

        console.log("Mensaje enviado");
    }

    return (
        <main className="regalo-page">

            <div className="regalo-cards">

                <Card>

                    <h1>Tu amigo invisible</h1>

                    <h2>Nombre</h2>
                    <p>{amigo.nombre}</p>

                    <h2>Le gusta</h2>
                    <ul>
                        {amigo.gustos.map((gusto) => (
                            <li key={gusto}>{gusto}</li>
                        ))}
                    </ul>

                    <h2>Regalo vetado</h2>
                    <p>{amigo.vetado}</p>

                    <h2>Tallas</h2>
                    <p>Camisa: {amigo.tallas.camisa}</p>
                    <p>Pantalón: {amigo.tallas.pantalon}</p>
                    <p>Zapatos: {amigo.tallas.zapatos}</p>

                </Card>

                <Card>

                    <h1>Mensaje</h1>

                    <h3>Solo tienes una pregunta y no seas muy obvio</h3>

                    <form onSubmit={enviarMensaje}>

                        <input
                            type="text"
                            placeholder="Escribe un mensaje anónimo..."
                        />

                        <Button>
                            Enviar mensaje
                        </Button>

                    </form>

                    <div className="mensaje-recibidos">

                        <h2>Respuesta</h2>

                        <p className="mensaje">
                            {respuesta || "No hay respuesta aún"}
                        </p>

                    </div>

                </Card>

            </div>

            <NavBar activePage="regalo" />

        </main>
    );
}