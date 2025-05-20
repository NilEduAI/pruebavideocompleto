import React from 'react';
import { Container, Typography, Box } from '@mui/material';
import VideoPlayer from '../components/VideoPlayer';

// Datos de ejemplo - Estos vendrían de tu backend
const sampleVideo = {
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  questions: [
    {
      time: 10,
      question: '¿Cuál es la capital de Francia?',
      options: ['Londres', 'París', 'Madrid', 'Roma'],
      correctAnswer: 'París'
    },
    {
      time: 20,
      question: '¿En qué año comenzó la Primera Guerra Mundial?',
      options: ['1914', '1918', '1939', '1945'],
      correctAnswer: '1914'
    }
  ]
};

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Plataforma de Aprendizaje Interactivo
        </Typography>
        <VideoPlayer
          videoUrl={sampleVideo.url}
          questions={sampleVideo.questions}
        />
      </Box>
    </Container>
  );
} 
