import React, { useState, useEffect } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import "./App.css";

// Imágenes utilizadas en el estado de la aplicación
const images = {
  abierto: require("./images/abierto.png"),
  feliz: require("./images/feliz.png"),
  cansado: require("./images/cansado.png"),
  enojado: require("./images/enojado.png"),
  guino: require("./images/guiño.png"),
  pensando: require("./images/pensando.png"),
  triste: require("./images/triste.png"),
};

const SpeechToTextComponent = () => {
  const [text, setText] = useState(""); // Estado para almacenar el texto reconocido
  const [status, setStatus] = useState("En espera"); // Estado para manejar el estado del reconocimiento de voz
  const [image, setImage] = useState(images.abierto); // Estado para manejar la imagen actual
  const { transcript, resetTranscript } = useSpeechRecognition(); // Hook para el reconocimiento de voz

  // Efecto para manejar el cambio de imagen en base al estado
  useEffect(() => {
    let interval;
    if (status === "En espera") {
      interval = setInterval(() => {
        setImage(prevImage => (prevImage === images.feliz ? images.abierto : images.feliz));
      }, 2500); // 2s feliz, 0.5s abierto
    } else if (status === "Escuchando" || status === "Hablando") {
      interval = setInterval(() => {
        setImage(prevImage => (prevImage === images.abierto ? images.feliz : images.abierto));
      }, 2500); // 2s abierto, 0.5s feliz
    }
    return () => clearInterval(interval); // Limpieza del intervalo cuando el componente se desmonta o el estado cambia
  }, [status]);

  // Función para iniciar el reconocimiento de voz
  const handleListen = () => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    // Iniciar reconocimiento de voz en español
    SpeechRecognition.startListening({ language: "es-ES" });
    setStatus("Escuchando");
  };

  // Función para detener el reconocimiento de voz
  const handleStop = () => {
    SpeechRecognition.stopListening();
    setText(transcript);
    resetTranscript();

    if (transcript.trim()) {
      setStatus("Pensando");
      setImage(images.pensando);

      // Enviar el texto reconocido al backend
      fetch("http://localhost:3001/api/openai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: transcript })
      })
        .then(response => response.json())
        .then(data => {
          const responseText = data.text; // Suponiendo que el backend devuelve { text: "respuesta del bot" }
          setStatus("Hablando");
          handleSpeak(responseText);
        })
        .catch(error => {
          console.error("Error al llamar a la API:", error);
          setStatus("En espera");
          setImage(images.abierto);
        });
    } else {
      alert("No se detectó contenido de la voz");
      setStatus("En espera");
      setImage(images.abierto);
    }
  };

  // Función para convertir texto en voz
  const handleSpeak = (textToSpeak) => {
    if (textToSpeak.trim()) {
      setStatus("Hablando");
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.lang = "es-ES"; // Establecer el idioma a español
      utterance.onend = () => {
        setImage(images.guino);
        setTimeout(() => {
          setStatus("En espera");
          setImage(images.abierto);
        }, 2000); // Cambiar la imagen a "guiño" por 2 segundos cuando termina de hablar
      };
      window.speechSynthesis.speak(utterance);
    } else {
      alert("No hay contenido en el cuadro de texto");
    }
  };

  // Función para manejar la detección de la frase desencadenadora
  const handleWakeWord = () => {
    if (!SpeechRecognition.browserSupportsSpeechRecognition()) {
      alert("Tu navegador no soporta reconocimiento de voz");
      return;
    }
    SpeechRecognition.startListening({ continuous: true, language: "es-ES" });

    SpeechRecognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      if (transcript.toLowerCase().includes("hola uli")) {
        SpeechRecognition.stopListening();
        setStatus("Escuchando");
        handleListen();

        // Detener automáticamente después de 5 segundos
        setTimeout(() => {
          handleStop();
        }, 5000);
      }
    };
  };

  useEffect(() => {
    handleWakeWord();
  }, []);

  return (
    <div className="centered">
      <div className="pixel-art-container">
        <img src={image} alt="Estado actual" className="state-image" />
        <div className="pixel-art">
          <textarea
            rows="4"
            cols="50"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="button-container">
            <button onClick={handleListen}>
              <img src="microphone-icon.png" alt="Microphone" />
            </button>
            <button onClick={handleStop}>Detener</button>
            <button onClick={() => handleSpeak(text)}>Hablar</button>
          </div>
        </div>
      </div>
      <span style={{ color: "white" }}>{status}</span>
    </div>
  );
};

const App = () => {
  return (
    <div className="background">
      <SpeechToTextComponent />
    </div>
  );
};

export default App;
