# Validação — 25/10/2026

## Motor aditivo e laboratório manual

- Ensaio real no Chrome concluído em **900,171 segundos**, numa cópia isolada de produção do motor: 90 medições a cada aproximadamente 10 s, trocas de notas e presets, todos os estados `running`, nenhum erro e encerramento correto. Maior pico amostrado: **0,231173**; menor RMS amostrado: **0,038033**. Relatório: `test-results/audio-soak.json`. Este monitoramento amostral não afirma detectar todo glitch transitório entre medições; não equivale a ensaio em todos os dispositivos ou browsers. A primeira tentativa em dev foi interrompida pelo hot reload e não foi contada.
- Síntese real em AudioWorklet, sem áudio gravado como fonte. A análise espectral do DSP verificou as proporções 1 / 0,28 / 0,12 / 0,05 / 0,02 e ausência de componente DC relevante. Testes verificam transição em ln(Hz), envelope, vibrato acionável, supressão de parciais acima de Nyquist, limiter com impulsos sobrecarregados, lifecycle assíncrono e calibração por gesto.
- 65 testes passaram, incluindo laboratório sem câmera, ativação por clique, teclado com prioridade da última nota, soltura de vibrato, silêncio ao perder foco, liberação de contexto e reverb estéreo amortecido em aproximadamente 2 s. Lint, TypeScript e build passaram.
- `scripts/audio-lab-smoke.mjs` passou no Chrome e Edge com Web Audio real: Lá4 medido próximo a 440 Hz, glissandos chegando a 880 e 220 Hz, vibrato ligando/desligando, apenas dois worklets por sessão, saída estéreo decorrelacionada e cauda desaparecendo. Bloqueio proposital da thread principal por 900 ms resultou em RMS abaixo de 0,0001 com reverb desligado. Não houve solicitação de câmera pelo laboratório.
- Regressão de mãos controladas passou com o novo motor. Frequências medidas na saída para Dó4: aproximadamente 261,80 Hz manual e 261,77 Hz automática durante acomodação, sem comparar apenas o valor solicitado ao oscilador. O guia, silêncio ao dobrar o indicador e avanço por acerto continuam funcionando.
- Testes de produção em localhost passaram no Chrome e Edge com modelo/WASM real e câmera sintética. Reprodução automática também passou: som real, silêncio em 0% e pausa, retomada em 1% e fechamento ao terminar.
- Os testes medem sinal e funcionamento. Não constituem avaliação auditiva humana, medição da latência ponta a ponta em hardware real ou comprovação de reprodução exata do RCA/Clara Rockmore. O limiter protege picos de amostra; não é um limiter true-peak com oversampling.

## Varinha e avanço por acerto

- Publicado no GitHub Pages; verificação do site público passou no Chrome e Edge com modelo/WASM reais e câmera sintética, sem erros de página, console ou requisições externas. O teste de calibração foi atualizado para a instrução de um indicador.
- 58 testes unitários/UI passaram. Cobrem indicador esticado/dobrado, ângulos invariantes a escala/rotação, qualquer mão nas duas funções, estabilidade com reordenação das mãos, mapeamento da régua à frequência e calibração automática com uma mão.
- Avanço por acerto exige 250 ms dentro de ±35 cents, na oitava correta e com ganho audível. Testes verificam nota errada, silêncio, bloqueio, nota repetida e ausência de avanço por tempo ou por amostra congelada. O guia publica apenas o alvo atual.
- `node scripts/wand-smoke.mjs` passou com landmarks controlados e Web Audio real no servidor de desenvolvimento: mão esquerda e direita individualmente, volume vertical, silêncio ao dobrar, avanço ao acertar e nenhum alvo futuro. Dó4 manual: 261,717 Hz; referência: 261,752 Hz durante acomodação do oscilador. Capturas desktop/mobile inspecionadas, sem overflow ou erros de página.
- Corrigida diferença de configuração: a referência deixa de substituir o vibrato configurado; presets durante o guia preservam faixa e escala. O modo varinha não usa altura para mudar o brilho, pois ela controla volume. Precisão com mãos reais e avaliação auditiva continuam dependentes de uso com webcam.

## Velocidade, afinação e reprodução da música

- 51 testes unitários/UI passaram, além de lint, TypeScript e build. Novos casos cobrem velocidade 0% congelada e 1%, correção positiva/negativa em cents, ausência de mão e silêncio da referência durante pausa ou bloqueio.
- `node scripts/song-audio-smoke.mjs` passou no Chrome com Web Audio real: nenhum áudio antes do clique, sinal na saída após iniciar, silêncio e tempo congelado em 0%, retomada em 1%, silêncio ao pausar e fechamento do AudioContext ao terminar. Nenhuma solicitação de câmera ou erro de página.
- `node scripts/song-smoke.mjs` passou novamente: bolinhas no topo junto à antena esquerda, mudança de nota, pausa e importação MIDI. Capturas desktop/mobile inspecionadas; sem overflow horizontal em 390 px.
- Build atualizado em localhost:5173. Os testes de sinal não substituem avaliação auditiva ou uso com mãos reais.

## PDF fornecido e bolinhas no topo

- PDF de quatro páginas renderizado e lido visualmente, com ampliações das pautas. SHA-256 da fonte: `49A04F4CBE4228918165835BFF0DFEA640D5BD5B54BE7A193E947AE9A75897F2`. O PDF original não foi alterado nem incluído nos assets públicos.
- Redução solo cobrindo 46 compassos; introdução com ostinato, acordes reduzidos e entradas melódicas priorizadas sobre notas sustentadas. Transcrição em durações de semínima, incluindo 5/4 (c2 e c9), 6/4 (c7, c8, c32), ligaduras e pausa geral. Leitura e redução manuais; não se afirma reprodução polifônica do piano ou equivalência ao vídeo.
- A única indicação de tempo na fonte é “Moderately”. Base de 96 BPM e duração das fermatas são escolhas de estudo configuráveis, explicitadas na interface. Duração padrão do arranjo: 125 s. Tema principal começa em c12, aos 31,25 s.
- 47 testes passaram: soma de tempos por compasso, limites temporais, ausência de sobreposição, pausa geral, ligadura longa, início por seção e escala de tempo ao alterar BPM/fermata, além dos testes existentes.
- Guia trocado de faixas verticais para círculos no topo: nota atual amarela e próxima azul. Regressão de navegador verifica também tamanho e posição vertical do marcador, pausa, lado da antena e importação MIDI. O PDF foi usado apenas para a transcrição local; não houve upload.

## Guia musical

- 44 testes passaram. Cobrem MIDI com tempo em outra trilha, mudanças de andamento, running status, note-on zero, canais, percussão, arquivos inválidos, notas sem término, intervalos de silêncio e fronteiras exatas entre notas. UI testa preparação de 3 segundos, pausa, finalização e bloqueio durante mute.
- `node scripts/song-smoke.mjs` passou no build de produção: troca efetiva de destaque, pausa estável, alvo à esquerda junto da haste, importação de MIDI original de teste e ausência de overflow em 390 px. Capturas desktop/mobile inspecionadas. Não houve erros de página nem requisições externas.
- Lint, TypeScript e build passaram. O guia foi reiniciado em localhost:5173 pelo script usado por `start.cmd`.
- O excerto da introdução usa ritmo de estudo explícito, sem alegar sincronismo com a gravação. A leitura do link MuseScore foi impedida por uma verificação Cloudflare. A música completa e seu timing não foram transcritos ou validados.

## Treino com antenas virtuais

- 35 testes unitários/UI passaram. Novos casos cobrem aproximação da haste, modo canhoto, inversão e sensibilidade, ajuste pelos dedos com palma fixa, ângulos invariantes a escala/rotação, silêncio no laço, preservação da pentatônica e calibração automática com amplitude de 0,08 da largura da imagem.
- `scripts/antenna-regression.mjs` usa landmarks controlados no servidor de desenvolvimento: verificou frequência por abertura dos dedos e aproximação, mute no laço, alvo seguinte após sustentação e articulação, persistência de calibração e layout estável. Capturas desktop/mobile inspecionadas; etiquetas da régua reduzidas para evitar sobreposição numa faixa estreita.
- `scripts/interaction-regression.mjs` continua validando o modo anterior (eixos da tela). Corrigida variação de altura da nota; cards mantiveram posição idêntica nos cinco estados de tracking. O teste confirmou sinal real na saída de áudio e calibração sem cliques.
- Chrome e Edge: build de produção passou com modelo/WASM reais e câmera sintética, sem requisições externas ou erros de console. Lint, tipos e build passaram; servidor reiniciado pelo mesmo script usado por `start.cmd`.
- Referência: metadados/descrição do vídeo de Carolina Eyck, quadros acessíveis e documentação oficial da técnica e das antenas. Não houve análise integral audiovisual, escuta comparativa, cópia da música nem avaliação com mãos reais. Não se afirma equivalência física, tímbrica ou pedagógica com Etherwave Pro ou método de oito posições.

Para repetir os testes com landmarks controlados sem parar o servidor de produção, inicie `npm.cmd run dev -- --host 127.0.0.1 --port 5174 --strictPort`. Em outro PowerShell, defina `$env:TEST_URL='http://127.0.0.1:5174/'` e execute `node scripts/antenna-regression.mjs` ou `node scripts/interaction-regression.mjs`. A substituição de visão existe apenas no contexto isolado do navegador de teste.

## Correções após teste de uso

- Musicalidade: 29 testes passaram, incluindo continuidade/monotonicidade da afinação assistida, posições da régua sob inversão/sensibilidade, migração do som legado, preservação de calibração/ganho nos presets e criação/reuso da onda harmônica.
- `node scripts/musical-smoke.mjs` verificou o build em localhost:5173: nenhum AudioContext antes do clique, sinal real no exemplo, encerramento automático/manual, troca de presets e nenhuma solicitação de câmera. Capturas desktop/mobile inspecionadas. A avaliação estética do timbre ainda depende de escuta; esses testes medem funcionamento, não beleza do som.

- 24 testes unitários/UI passaram, incluindo calibração inteira sem cliques, cancelamento, mãos ausentes/congeladas, amplitude insuficiente e handedness ambígua/duplicada.
- Regressão no Chrome com landmarks controlados e Web Audio real: elevar a mão de volume aumentou o ganho e um AnalyserNode confirmou sinal não nulo na saída. Perder as mãos zerou o medidor. Isso valida a cadeia de áudio, sem substituir escuta ou testar precisão de mãos reais.
- A posição vertical dos cards de instrução permaneceu idêntica nos cinco cenários de tracking (duas mãos, somente pitch, somente volume, fora da área e nenhuma mão).
- A calibração completou as três etapas, persistiu limites e liberou o som sem clicar em Continuar. Capturas desktop e mobile inspecionadas.
- Para reproduzir essa regressão, execute `stop.cmd`, inicie `npm.cmd run dev -- --port 5173 --strictPort` e, em outro terminal, execute `node scripts/interaction-regression.mjs`. O teste exige o servidor de desenvolvimento (o `start.cmd` serve o build de produção). Ele substitui somente o módulo de visão no contexto isolado do navegador; não adiciona modo simulado à aplicação publicada.

- TypeScript strict, ESLint e testes Vitest/Testing Library executados localmente.
- Build de produção verificado na raiz e no caminho `/Theremin/`; assets locais incluem modelo, WASM, atribuição e licença. O build verifica versão, integridade do modelo e igualdade dos WASM com o pacote instalado.
- Chrome e Microsoft Edge instalados no Windows: testes Playwright headless com câmera sintética, carregamento real de modelo/WASM e inferência GPU. Inicialização após clique, FPS medido, gravação e link de download, mute, bloqueio de calibração sem mãos e liberação da câmera ao parar passaram.
- O teste monitora requisições externas, exceções e erros de console; todos devem estar vazios. MediaPipe 1.1.1 foi rejeitado por emitir telemetria. A versão final 0.10.21 passou sem requisições externas; CSP restringe conexões à própria origem.
- Capturas desktop (1440 px) e mobile (390 px) inspecionadas. Corrigido recorte de controle em viewport estreita. Verificação automática de overflow horizontal e limites do botão de iniciar.
- Testes unitários cobrem logaritmo, clamps, inversões, escalas, EMA, tolerância de 150 ms, mão ausente, identificação manual, baixa confiança, parâmetros persistidos inválidos, fallback de câmera, permissão negada, cancelamento durante permissão, ganho inicial zero, limites de áudio, fade agendado, fechamento do contexto, fallback GPU/CPU e espelhamento.

## Reproduzir teste de navegador

Requer Chrome e Edge instalados. Em um terminal PowerShell:

```powershell
$env:VITE_BASE_PATH='/Theremin/'
npm.cmd run build
npm.cmd run preview
```

Em outro terminal: `npm.cmd run test:browser`. `TEST_URL` permite outra origem/base. As capturas e o relatório JSON ficam em `test-results/` (ignorados pelo Git).

## Ainda exige validação humana / outros dispositivos

- Não houve execução com mãos reais diante da webcam nem avaliação auditiva de musicalidade, vibrato natural, cliques ou recuperação. A câmera sintética valida a infraestrutura, não a precisão com pessoas.
- Safari/iOS e Android físicos não estavam disponíveis. Viewport mobile no desktop não equivale a testar nesses dispositivos.
- O Chrome headless produziu capturas parcialmente vazias ao redimensionar após encerrar uma sessão WebGL, embora os controles continuassem localizáveis. As capturas móveis finais foram feitas após recarregar a página. Rotação/redimensionamento após tocar ainda merece verificação visual em navegador com janela e hardware real.
- Não foi medida latência de ponta a ponta; apenas FPS e tempo da chamada de inferência. Não há promessa de desempenho em hardware diferente.
- Workflow preparado e versões das Actions conferidas; publicação real no GitHub Pages não foi executada, pois a pasta não estava vinculada a um repositório remoto.
- PWA e MIDI continuam no escopo futuro opcional da fase 6. Gravação local e presets já foram entregues.
