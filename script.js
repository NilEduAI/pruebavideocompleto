let player;
let videoInterval;
let questions = []; // Aquí se almacenarán las preguntas
let currentQuestionIndex = -1;
let videoId = null;
let userAnswers = []; // Para guardar las respuestas del usuario

// --- Elementos del DOM ---
const youtubeUrlInput = document.getElementById('youtubeUrl');
const loadVideoButton = document.getElementById('loadVideoButton');
const questionsArea = document.getElementById('questions-area');
const questionTextElem = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const openAnswerInput = document.getElementById('open-answer');
const submitAnswerButton = document.getElementById('submit-answer');
const feedbackElem = document.getElementById('feedback');
const customQuestionsTextarea = document.getElementById('customQuestions');
const applyCustomQuestionsButton = document.getElementById('applyCustomQuestions');
const customQuestionsInputDiv = document.querySelector('.custom-questions-input');


// --- Preguntas de ejemplo (reemplazar con IA o entrada manual) ---
// Este es el formato que tus preguntas deben seguir
// `time`: segundo en el que aparecerá la pregunta
// `type`: 'MCQ' (Opción Múltiple) o 'OPEN' (Respuesta Abierta)
// `text`: El texto de la pregunta
// `options` (solo para MCQ): array de strings con las opciones
// `correctAnswer` (solo para MCQ): índice de la opción correcta (0-indexed) o texto para OPEN

const exampleQuestions = {
    'L_jWHffIx5E': [ // Ejemplo: Video "Learn JavaScript - Full Course for Beginners"
        { time: 10, type: 'MCQ', text: '¿Qué lenguaje se menciona como fundamental para el desarrollo web?', options: ['Python', 'JavaScript', 'Java', 'C++'], correctAnswer: 1 },
        { time: 25, type: 'OPEN', text: '¿Cuál es el propósito de la consola en JavaScript según el video?', correctAnswer: 'mostrar información, depurar, interactuar' }, // Palabras clave para evaluar
        { time: 60, type: 'MCQ', text: '¿"var", "let" y "const" son para?', options: ['Crear funciones', 'Declarar variables', 'Bucles', 'Comentarios'], correctAnswer: 1 }
    ],
    'default': [ // Preguntas por defecto si el video no tiene predefinidas
        { time: 15, type: 'MCQ', text: '¿Te está gustando el video?', options: ['Sí', 'No', 'Más o menos'], correctAnswer: 0 },
        { time: 30, type: 'OPEN', text: '¿Cuál es la idea principal hasta ahora?' }
    ]
};

// --- Lógica de YouTube API ---
function onYouTubeIframeAPIReady() {
    // Esta función se llama automáticamente cuando la API está lista.
    // No creamos el player aquí, sino al cargar el video.
}

function extractVideoID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

loadVideoButton.addEventListener('click', () => {
    const url = youtubeUrlInput.value;
    videoId = extractVideoID(url);

    if (videoId) {
        // Limpiar player anterior si existe
        if (player) {
            player.destroy();
        }
        document.getElementById('player').innerHTML = ''; // Limpia el div por si acaso

        player = new YT.Player('player', {
            height: '360',
            width: '640',
            videoId: videoId,
            playerVars: {
                'playsinline': 1,
                'controls': 0, // Ocultamos controles para forzar interacción
                'disablekb': 1, // Deshabilitar control por teclado
                'modestbranding': 1,
                'rel': 0 // No mostrar videos relacionados al final
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
        customQuestionsInputDiv.classList.remove('hidden');
        // Cargar preguntas predefinidas o por defecto
        if (exampleQuestions[videoId]) {
            questions = JSON.parse(JSON.stringify(exampleQuestions[videoId])); // Copia profunda
        } else {
            questions = JSON.parse(JSON.stringify(exampleQuestions['default']));
        }
        questions.sort((a, b) => a.time - b.time); // Asegurar orden por tiempo
        currentQuestionIndex = -1; // Resetear índice de pregunta
        userAnswers = []; // Resetear respuestas
        questionsArea.classList.add('hidden');
        feedbackElem.classList.add('hidden');

    } else {
        alert("URL de YouTube no válida.");
    }
});

applyCustomQuestionsButton.addEventListener('click', () => {
    const customText = customQuestionsTextarea.value.trim();
    if (!customText) {
        alert("Por favor, introduce preguntas en el formato especificado o deja el área vacía para usar las de ejemplo.");
        // Recargar preguntas de ejemplo si se borró el texto
        if (videoId && exampleQuestions[videoId]) {
            questions = JSON.parse(JSON.stringify(exampleQuestions[videoId]));
        } else {
            questions = JSON.parse(JSON.stringify(exampleQuestions['default']));
        }
        questions.sort((a, b) => a.time - b.time);
        return;
    }
    try {
        const parsedQuestions = customText.split('\n').map(line => {
            const parts = line.split(';');
            if (parts.length < 3) throw new Error("Línea malformada: " + line);
            const time = parseInt(parts[0].trim(), 10);
            const type = parts[1].trim().toUpperCase();
            const text = parts[2].trim();
            
            if (isNaN(time)) throw new Error("Tiempo inválido: " + parts[0]);

            if (type === 'MCQ') {
                if (parts.length < 5) throw new Error("Pregunta MCQ necesita al menos una opción y una respuesta: " + line);
                const options = parts.slice(3, parts.length - 1).map(opt => opt.trim());
                const correctAnswer = parseInt(parts[parts.length - 1].trim(), 10);
                if (isNaN(correctAnswer) || correctAnswer < 0 || correctAnswer >= options.length) {
                    throw new Error("Respuesta correcta inválida para MCQ: " + parts[parts.length - 1]);
                }
                return { time, type, text, options, correctAnswer };
            } else if (type === 'OPEN') {
                // Para OPEN, la "correctAnswer" es opcional y puede ser usada para una evaluación simple
                const correctAnswer = parts.length > 3 ? parts[3].trim() : undefined;
                return { time, type, text, correctAnswer };
            } else {
                throw new Error("Tipo de pregunta desconocido: " + type);
            }
        });
        questions = parsedQuestions.sort((a, b) => a.time - b.time);
        currentQuestionIndex = -1;
        userAnswers = [];
        alert("Preguntas personalizadas aplicadas. Reinicia el video si ya estaba reproduciéndose.");
        if (player && player.getPlayerState() !== YT.PlayerState.CUED) {
             // Si el video está cargado, busca la siguiente pregunta para mostrarla si ya pasó su tiempo.
            player.seekTo(0); // Opcional: reiniciar el video para probar las nuevas preguntas
            player.pauseVideo();
        }
    } catch (error) {
        alert("Error procesando preguntas personalizadas: " + error.message);
        console.error("Error procesando preguntas:", error);
    }
});


function onPlayerReady(event) {
    // El video está listo para reproducirse
    // event.target.playVideo(); // Podrías autoiniciar aquí
    console.log("Player Ready");
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.PLAYING) {
        startVideoInterval();
    } else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
        clearInterval(videoInterval);
    }
}

function startVideoInterval() {
    clearInterval(videoInterval); // Limpiar intervalo anterior
    videoInterval = setInterval(() => {
        if (!player || typeof player.getCurrentTime !== 'function') return;
        const currentTime = Math.floor(player.getCurrentTime());
        
        // Buscar la próxima pregunta que aún no se ha mostrado
        const nextQuestionToShow = questions.find((q, index) => currentTime >= q.time && index > currentQuestionIndex);

        if (nextQuestionToShow) {
            player.pauseVideo();
            currentQuestionIndex = questions.indexOf(nextQuestionToShow);
            displayQuestion(questions[currentQuestionIndex]);
        }

    }, 1000); // Comprueba cada segundo
}

function displayQuestion(question) {
    questionTextElem.textContent = question.text;
    optionsContainer.innerHTML = ''; // Limpiar opciones anteriores
    openAnswerInput.classList.add('hidden');
    openAnswerInput.value = ''; // Limpiar respuesta abierta anterior
    feedbackElem.classList.add('hidden');
    feedbackElem.textContent = '';

    if (question.type === 'MCQ') {
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.textContent = option;
            button.dataset.index = index;
            button.addEventListener('click', (e) => {
                // Desmarcar otros botones y marcar este
                optionsContainer.querySelectorAll('button').forEach(btn => btn.classList.remove('selected'));
                e.target.classList.add('selected');
            });
            optionsContainer.appendChild(button);
        });
    } else if (question.type === 'OPEN') {
        openAnswerInput.classList.remove('hidden');
    }
    questionsArea.classList.remove('hidden');
}

submitAnswerButton.addEventListener('click', () => {
    if (currentQuestionIndex < 0 || currentQuestionIndex >= questions.length) return;

    const currentQ = questions[currentQuestionIndex];
    let userAnswer;
    let isCorrect = false;

    if (currentQ.type === 'MCQ') {
        const selectedOption = optionsContainer.querySelector('button.selected');
        if (!selectedOption) {
            alert("Por favor, selecciona una opción.");
            return;
        }
        userAnswer = parseInt(selectedOption.dataset.index);
        isCorrect = (userAnswer === currentQ.correctAnswer);
        feedbackElem.textContent = isCorrect ? "¡Correcto!" : `Incorrecto. La respuesta era: ${currentQ.options[currentQ.correctAnswer]}`;
    } else if (currentQ.type === 'OPEN') {
        userAnswer = openAnswerInput.value.trim();
        if (!userAnswer) {
            alert("Por favor, escribe tu respuesta.");
            return;
        }
        // Evaluación simple para respuestas abiertas (opcional)
        if (currentQ.correctAnswer) {
            // Podrías hacer una comparación más sofisticada aquí (ej. palabras clave)
            isCorrect = userAnswer.toLowerCase().includes(currentQ.correctAnswer.toLowerCase());
            feedbackElem.textContent = isCorrect ? "Respuesta recibida. ¡Buen intento!" : "Respuesta recibida.";
        } else {
            isCorrect = true; // Si no hay respuesta correcta definida, se asume como "recibida"
            feedbackElem.textContent = "Respuesta recibida.";
        }
    }
    
    userAnswers[currentQuestionIndex] = { question: currentQ.text, answer: userAnswer, correct: isCorrect };
    console.log("Respuestas del usuario:", userAnswers);


    feedbackElem.className = isCorrect ? 'correct' : 'incorrect'; // Remueve todas las clases y añade la nueva
    feedbackElem.classList.remove('hidden');

    // Ocultar pregunta y reanudar video después de un breve momento o al hacer clic en "Continuar"
    // Por ahora, el botón "Responder" también sirve como "Continuar"
    // Se podría cambiar el texto del botón a "Continuar" después de responder
    questionsArea.classList.add('hidden');
    if (player && typeof player.playVideo === 'function') {
         player.playVideo();
    }

    // Si es la última pregunta, podríamos mostrar un resumen o algo así
    if (currentQuestionIndex === questions.length - 1) {
        setTimeout(() => { // Pequeña demora para que el usuario vea el feedback
            // alert("¡Has completado todas las preguntas!");
            console.log("Fin del cuestionario. Puntuación final (si aplica):", calculateScore());
        }, 1500);
    }
});

function calculateScore() {
    if (userAnswers.length === 0) return "N/A";
    const correctCount = userAnswers.filter(ans => ans && ans.correct).length;
    const totalMCQs = questions.filter(q => q.type === 'MCQ').length; // Solo calificar MCQs automáticamente por ahora
    if (totalMCQs === 0) return "N/A (sin preguntas de opción múltiple)";
    return `${correctCount} de ${totalMCQs} MCQs correctas (${((correctCount / totalMCQs) * 100).toFixed(0)}%)`;
}

// --- Lógica para "Generación de Preguntas" (Placeholder) ---
// En una aplicación real, aquí harías una llamada a un backend
// que use una API de IA (como OpenAI GPT) para analizar la transcripción
// del video y generar preguntas.
async function generateQuestionsFromVideo(videoId) {
    // 1. Obtener transcripción del video (requiere backend o API externa)
    //    Ejemplo con youtube-transcript-api (biblioteca de Python, necesitarías un backend Flask/Django)
    //    const transcript = await fetch(`/api/get_transcript?video_id=${videoId}`).then(res => res.json());
    //    const transcriptText = transcript.text;

    // 2. Enviar transcripción a un modelo de IA para generar preguntas
    //    const aiGeneratedQuestions = await fetch('/api/generate_questions', {
    //        method: 'POST',
    //        headers: { 'Content-Type': 'application/json' },
    //        body: JSON.stringify({ transcript: transcriptText, num_questions: 5 })
    //    }).then(res => res.json());
    //
    //    questions = aiGeneratedQuestions.questions; // Asumiendo que la API devuelve un formato compatible

    // Por ahora, usamos las de ejemplo:
    console.warn("Usando preguntas de ejemplo. La generación automática de IA no está implementada en esta demo frontend.");
    if (exampleQuestions[videoId]) {
        questions = JSON.parse(JSON.stringify(exampleQuestions[videoId]));
    } else {
        questions = JSON.parse(JSON.stringify(exampleQuestions['default']));
    }
    questions.sort((a, b) => a.time - b.time);
    currentQuestionIndex = -1;
}

// Cargar la API de YouTube IFrame de forma asíncrona
// (El tag script en HTML ya lo hace, pero esta es otra forma)
// var tag = document.createElement('script');
// tag.src = "https://www.youtube.com/iframe_api";
// var firstScriptTag = document.getElementsByTagName('script')[0];
// firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Inicializar la entrada de URL con un ejemplo si se desea
youtubeUrlInput.value = 'https://www.youtube.com/watch?v=L_jWHffIx5E'; // Video de ejemplo