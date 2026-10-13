import Card from "@/components/Card/Card";
import NavBar from "@/components/NavBar/NavBar";
import "./grupo.css";

export default function grupo() {

    const evento = getEvento();

    function getEvento() {

        // API bla bla bla

        return {
            fecha: "20 de diciembre de 2026",
            lugar: "Santa Cruz de Tenerife",
            precioMinimo: 10,
            precioMaximo: 30
        };
    }

    return (
        <main>

            <Card>

                <h1>Familia torrijos amigo invisible</h1>

                <h2>Fecha</h2>
                <p>{evento.fecha}</p>

                <h2>Lugar</h2>
                <p>{evento.lugar}</p>

                <h2>Precio</h2>
                <p>
                    {evento.precioMinimo}€ - {evento.precioMaximo}€
                </p>

            </Card>

            <NavBar activePage="grupo" />

        </main>
    );
}