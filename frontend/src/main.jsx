/**
 * =============================================================================
 * FRONTEND — PONTO DE ENTRADA (Vite + React)
 * =============================================================================
 * - `index.html` tem <div id="root">; este ficheiro “monta” a aplicação React aí dentro.
 * - `BrowserRouter`: sem isto não há rotas (`/login`, `/estoque`, …) nem `useNavigate`.
 * - `StrictMode` (dev): avisos extra do React para efeitos e keys duplicadas.
 * - `./styles/app.css`: estilos globais (Bootstrap/AdminLTE + Batmotor).
 * - `./styles/texto.css` e `./styles/botao.css`: legibilidade de texto e botões (fornecedores, sem conflito com Bootstrap).
 * Folhas por página (ex.: relatórios) importam-se dentro do componente da respetiva rota.
 * Leitura recomendada para o professor: `docs/GUIA_PEDAGOGICO_BATMOTOR.md` (visão completa).
 * Próximo ficheiro na cadeia: `App.jsx` (layout, sessão, lista de `<Route>`).
 * =============================================================================
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/app.css";
import "./styles/texto.css";
import "./styles/botao.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
