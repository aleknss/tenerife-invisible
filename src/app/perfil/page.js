"use client";

import Card from "@/components/Card/Card";
import Button from "@/components/Button/Button";
import "./perfil.css";
import NavBar from "@/components/NavBar/NavBar";

export default function perfil() {
   
  var pregunta = getPregunta() ; 
function getPregunta() {
    return ""
     //api bla bla bal

}

    function responderPregunta(e) {
 
        console.log("Respuesta enviada");
    }
    function guardarPerfil(e) {
 
        //   mandar  los datos a la BDD
        console.log("Perfil guardado");
    }

    return (
        <main className="perfil-page">
    <div className="perfil-cards">

            <Card>

                <h1>Mi perfil</h1>

                <form onSubmit={guardarPerfil}>
               
                           <input
                    type="password"
                    placeholder="Cambiar Contraseña" />                            
                    <h2>3 cosas que me gustan</h2>

                    <input
                        type="text"
                        placeholder="Cosa que me gusta 1"
                    />

                    <input
                        type="text"
                        placeholder="Cosa que me gusta 2"
                    />

                    <input
                        type="text"
                        placeholder="Cosa que me gusta 3"
                    />

                    <h2>Regalo vetado</h2>

                    <input
                        type="text"
                        placeholder="Algo que no quiero que me regalen"
                    />

                    <h2>Tallas</h2>

                    <input
                        type="text"
                        placeholder="Talla de camisa"
                    />

                    <input
                        type="text"
                        placeholder="Talla de pantalón"
                    />

                    <input
                        type="text"
                        placeholder="Talla de zapatos"
                    />

                    <Button>
                        Guardar
                    </Button>

                </form>

            </Card>

                <Card>

                    <h1>Pregunta del amigo invisible</h1>
                     {pregunta === "" ? (
                        <p>
                            De momento no te ha preguntado nada.
                        </p>
                    ) : (
                        <>
                            <p className="pregunta">
                                {pregunta}
                            </p>

                            <form onSubmit={responderPregunta}>

                                <input
                                    type="text"
                                    placeholder="Escribe tu respuesta"
                                />

                                <Button>
                                    Enviar
                                </Button>

                            </form>
                        </>
                    )}

                </Card>
                  </div>
 


         <NavBar activePage="perfil" />
        </main>
    );
}