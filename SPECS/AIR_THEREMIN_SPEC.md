# Air Theremin — Especificação de implementação para Codex

## 1. Objetivo
Construir um theremin virtual tocável com as duas mãos diante de uma webcam, como aplicação web estática, responsiva e instalável opcionalmente como PWA. Desenvolver no VS Code com Codex e publicar no GitHub Pages. **Entregar código funcional**, não apenas mockups.

## 2. Restrições obrigatórias
- Frontend: React, TypeScript (strict), Vite.
- Sem backend, banco de dados, chaves privadas ou serviços pagos.
- Processar vídeo e landmarks localmente; nunca enviar frames ou áudio a servidores.
- Rastreamento: `@mediapipe/tasks-vision`, Hand Landmarker em modo VIDEO, até 2 mãos.
- Síntese: Web Audio API nativa (AudioContext, OscillatorNode, GainNode, BiquadFilterNode, ConvolverNode opcional). Tone.js é opcional, somente se trouxer benefício concreto.
- Compatível com GitHub Pages em caminho `/NOME-DO-REPOSITORIO/` e também com domínio próprio ou raiz.
- Usar HTTPS em produção (GitHub Pages fornece); `localhost` em desenvolvimento.
- Sem dependência de API em tempo de execução. Os modelos/WASM do MediaPipe devem ser empacotados como assets locais em `public/mediapipe/`, com licença e atribuições respeitadas. Evitar CDN obrigatória.
- Nenhum áudio antes de um gesto explícito do usuário (botão Iniciar); parar ao desativar, ocultar a página ou perder rastreamento.

## 3. Experiência principal
1. Página inicial com nome **Air Theremin**, botão `Iniciar câmera e áudio`, indicação de privacidade e botão de configurações.
2. Após permissão: preview da webcam espelhado, esqueleto das duas mãos e zonas visuais de controle.
3. Mão direita controla **pitch** por coordenada horizontal normalizada; mão esquerda controla **volume** por coordenada vertical normalizada. Incluir inversão configurável dos eixos e opção para canhotos.
4. Mostrar nota aproximada, frequência (Hz), volume, indicador de rastreamento, FPS e latência estimada apenas se medida; nunca inventar latência.
5. Som monofônico contínuo, sem passos entre notas no modo livre. Movimento pequeno gera vibrato natural.
6. Quando mão de volume não está visível, fazer fade-out seguro; quando mão de pitch desaparece, manter por no máximo 150 ms e então fazer fade-out. Não emitir sons altos na recuperação.
7. Botões `Parar`, `Mutar`, `Calibrar`, `Configurações` e `Gravar` (gravação pode ser etapa posterior).

## 4. Mapeamento e calibração
- Definir uma área útil horizontal de pitch (por exemplo, 15–85% da largura do vídeo), calibrável; mapear x para escala logarítmica entre 110 e 1760 Hz por padrão (configurável, com limites seguros).
- Frequência: `f = fMin * (fMax/fMin) ** t`, em que `t` é posição normalizada e limitada entre 0 e 1.
- Volume: mapear a altura vertical da mão esquerda para ganho percebido, usando curva não linear (`gain = t ** 2`, por exemplo), e suavizar transições.
- Coordenadas devem corresponder à **imagem espelhada exibida**, independentemente da orientação real do vídeo. Documentar conversão.
- Usar centro da palma ou landmark estável para pitch e volume; oferecer escolha experimental de ponta do indicador em configurações.
- Calibração guiada em 3 etapas: postura neutra, limites de pitch, limites de volume. Guardar apenas parâmetros no localStorage, nunca vídeo.
- Permitir ajuste manual dos limites, sensibilidade, inversão e mão dominante.
- Não depender exclusivamente da classificação de handedness do MediaPipe: oferecer identificação manual, pois o espelhamento pode confundir a percepção do usuário.

## 5. Áudio
- Criar AudioContext somente após clique de usuário; retomar contexto suspenso quando necessário.
- Oscilador principal com onda senoidal por padrão, com opções triangle e sawtooth filtrada; ganho inicial zero.
- Usar `AudioParam.setTargetAtTime` ou rampas curtas para frequência e ganho, evitando zipper noise, cliques e oscilações bruscas.
- Volume máximo conservador e limiter/compressor opcional para evitar picos; nunca elevar ganho automaticamente.
- Efeitos opcionais: vibrato controlável, reverb e leve delay. Priorizar baixa latência e estabilidade.
- Controle de mute com fade-out; liberar tracks de câmera e fechar AudioContext em `Parar` e desmontagem.
- Em troca de aba ou perda prolongada de tracking, silenciar imediatamente com rampa curta. Retomar somente quando condições seguras forem restabelecidas.
- Frequência e volume devem ser atualizados em loop independente do render React; não usar setState por frame para dirigir o áudio.

## 6. Visão computacional e desempenho
- Solicitar `getUserMedia({video:{facingMode:'user',width:{ideal:1280},height:{ideal:720}},audio:false})` com fallback para resoluções menores.
- Inicializar MediaPipe Hand Landmarker, `runningMode: 'VIDEO'`, `numHands: 2`.
- Preferir `requestVideoFrameCallback` quando disponível, com fallback controlado; evitar múltiplas inferências simultâneas.
- Usar `detectForVideo(video, timestampMs)` com timestamps crescentes; reduzir resolução/frequência de inferência quando necessário.
- Tentar delegate GPU e oferecer fallback CPU quando suportado; não presumir GPU disponível.
- Suavização: filtro One Euro ou EMA adaptativa com parâmetros ajustáveis. Equilibrar jitter e atraso; não prometer latência específica sem medir.
- Detectar perda de mãos, baixa confiança e posições fora da área calibrada.
- Em dispositivos móveis, lidar com câmera frontal, orientação e bateria; interface touch para iniciar/parar.

## 7. Interface e identidade visual
- Visual escuro, elegante e futurista; evitar excesso de elementos que prejudiquem leitura.
- Layout desktop: câmera com overlay à esquerda; medidores e controles à direita. Mobile: layout empilhado.
- Animação de onda sonora, linha/grade de pitch e barra de volume; respeitar `prefers-reduced-motion`.
- Mensagens claras para permissão negada, ausência de webcam, MediaPipe não carregado, contexto de áudio bloqueado e navegador incompatível.
- Acessibilidade: contraste, foco visível, botões com rótulos, controles por teclado, instruções sem depender apenas de cor.
- Idioma principal pt-BR.

## 8. Estrutura sugerida
```text
/
  .github/workflows/deploy.yml
  public/mediapipe/                 # modelo e WASM locais
  src/
    app/App.tsx
    components/CameraStage.tsx
    components/AudioControls.tsx
    components/CalibrationWizard.tsx
    components/StatusPanel.tsx
    hooks/useCamera.ts
    hooks/useHandTracking.ts
    audio/ThereminEngine.ts
    vision/HandTracker.ts
    mapping/gestureMapping.ts
    mapping/smoothing.ts
    types/theremin.ts
    styles/
    main.tsx
  tests/
  index.html
  vite.config.ts
  package.json
  README.md
  LICENSE
```
Separar claramente engine de áudio, visão, mapeamento e UI. Evitar lógica pesada dentro de componentes React.

## 9. GitHub Pages e caminhos
- Em `vite.config.ts`, usar `base: process.env.VITE_BASE_PATH || '/'` (ou solução equivalente documentada).
- Para projeto `https://USUARIO.github.io/REPO/`, construir com `VITE_BASE_PATH=/REPO/`.
- Para domínio próprio ou repositório `USUARIO.github.io`, usar `/`.
- Todos os caminhos de modelo, WASM e assets devem respeitar `import.meta.env.BASE_URL`; **não usar caminhos absolutos fixos** como `/mediapipe/model.task`.
- SPA com uma única rota é preferível para evitar erro 404 no refresh do GitHub Pages.
- Criar workflow GitHub Actions com `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run build`, `actions/upload-pages-artifact`, `actions/deploy-pages`, permissões `pages: write` e `id-token: write`, usando versões estáveis atuais verificadas na implementação.
- Documentar opção de publicação manual da pasta `dist` quando Actions estiver indisponível, inclusive limitações do método escolhido.
- README: requisitos, `npm install`, `npm run dev`, `npm run build`, `npm run preview`, permissões da webcam, configuração Pages, base path, solução de problemas.

## 10. Testes e critérios de aceite
- Testes unitários com Vitest para mapeamento logarítmico, clamps, inversões, perda de rastreamento e suavização.
- Testes de UI com Testing Library; simular permissões e erros sem exigir câmera em CI.
- Verificar build de produção com `npm run build` e `npm run preview` usando caminho-base de subdiretório.
- Testar manualmente em Chrome/Edge desktop; testar Safari e Android quando possível, documentando limitações.
- A câmera funciona em localhost e GitHub Pages HTTPS; o navegador pede permissão.
- As duas mãos são reconhecidas e controles são independentes.
- Som inicia apenas após clique e fica silencioso ao parar/perder rastreamento.
- Mudanças suaves de frequência e volume sem cliques perceptíveis em condições normais.
- Nenhuma requisição de rede transmite vídeo/áudio. Assets locais carregam corretamente em `/REPO/`.
- Build sem erros TypeScript, testes passando e sem erros no console no fluxo principal.

## 11. Plano de implementação para Codex
**Fase 1 — Fundação:** scaffold React/TS/Vite, design responsivo, componentes, testes e configuração Pages.

**Fase 2 — Câmera e rastreamento:** permissão, preview, modelo MediaPipe local, landmarks, duas mãos, erros e limpeza de recursos.

**Fase 3 — Theremin funcional:** AudioContext, oscilador, ganho, mapeamento de mãos, suavização, perda de tracking e mute seguro.

**Fase 4 — Musicalidade:** calibração, escalas opcionalmente quantizadas, timbres, vibrato e efeitos.

**Fase 5 — Qualidade e publicação:** testes, documentação, otimização, GitHub Actions, validação em caminho-base e revisão de acessibilidade.

**Fase 6 — Futuro (não bloquear MVP):** gravação via MediaStreamAudioDestinationNode + MediaRecorder quando suportado, exportação de áudio, presets, MIDI e PWA.

## 12. Instruções diretas ao Codex
Implemente este projeto em etapas, com arquivos reais e código executável. Comece pelas fases 1–3 e garanta um theremin tocável antes de adicionar efeitos avançados. Não invente APIs nem deixe TODOs no caminho principal. Ao fim de cada fase, execute lint, typecheck, testes e build; corrija falhas. Caso precise obter os arquivos do MediaPipe, documente origem, versão, licença e copie-os para `public/mediapipe/`. Verifique os caminhos dos assets em GitHub Pages. Não introduza backend, segredos ou serviços remotos. Informe claramente limitações reais de navegador, latência e hardware.
