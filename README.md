# Poker Uplife (React)

Frontend moderno para consumir os dados do Google Sheets via Apps Script. 

## Requisitos
- Node.js 18+

## Configuração
1) Copie o `.env.example` para `.env`
2) Preencha a URL do seu Web App do Apps Script:
   - `VITE_API_BASE=https://script.google.com/macros/s/SEU_ID/exec`

> Importante: para rodar no GitHub Pages sem dor, o backend deve aceitar JSONP via `?callback=...`.

## Rodar local
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy no GitHub Pages
- Use a pasta `dist/` gerada no build
- O projeto já usa `base: "./"` e `HashRouter` para evitar problemas de rota.
