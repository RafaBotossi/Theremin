# Air Theremin

Instrumento para webcam, feito com React, TypeScript strict, Vite, MediaPipe Hand Landmarker e Web Audio. O padrão é uma varinha controlada pelo indicador de qualquer mão; o modo de duas antenas continua disponível nas configurações. Vídeo, landmarks e som são processados no navegador. Não há backend, analytics, microfone, conta, API remota nem CDN em execução.

## Executar

No Windows, dê dois cliques em `start.cmd` e abra **http://localhost:5173/**. O atalho para o servidor anterior, executa `npm.cmd run build` com base `/` e inicia a versão de produção (`vite preview`) em segundo plano. Se o build falhar, o servidor permanece parado. Após editar o código, execute `start.cmd` novamente para reconstruir. Use `stop.cmd` para apenas encerrar. Os logs do servidor ficam em `.local-server/`; o resultado do build aparece na janela do atalho. Os atalhos precisam das dependências instaladas e não alteram a política de execução permanente do PowerShell. Para desenvolvimento com atualização automática, use `npm.cmd run dev`.

Use Node.js 24.14 ou superior e npm. No PowerShell com scripts bloqueados, use `npm.cmd` no lugar de `npm`.

```sh
npm install
npm run dev
```

Abra a URL localhost indicada pelo Vite ou https://rafabotossi.github.io/Theremin/. Clique **Iniciar câmera e áudio** e permita a webcam. Use boa iluminação e estique o indicador de qualquer mão: a ponta controla a nota na horizontal e o volume na vertical. Dobrar o indicador ou retirar a mão silencia. Se as duas mãos estiverem esticadas, uma permanece ativa, sem misturar posições. **Parar** libera câmera e AudioContext. **Mutar** mantém o rastreamento sem som. A gravação captura somente a síntese e permite baixar o arquivo localmente, sem upload.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

## Controles e calibração

### Escolha de música e guia visual

**Tocar nota por nota** avança apenas após sustentar o alvo por 250 ms dentro de ±35 cents, com som audível. Apenas a bolinha da nota a tocar aparece. Não basta acertar o nome em outra oitava. Notas repetidas exigem dobrar e esticar o indicador. Nesse modo, as pausas e durações ficam a cargo de quem toca; a velocidade controla apenas a reprodução e o guia com tempo. **Avanço da música** permite alternar os dois modos.

O padrão **Varinha** usa exclusivamente o indicador, sem laço circular. **Calibrar** mede horizontal e vertical com uma mão, avançando sem cliques e pausando com o dedo dobrado. Os presets preservam esse modo; durante uma música, também preservam a faixa e afinação do guia. Referência automática e instrumento usam o mesmo timbre, efeitos e vibrato. A referência tem volume fixo, enquanto o volume tocado depende da altura do indicador. A barra de afinação compara frequências, não apenas nomes arredondados de notas.

Em **Toque uma música**, selecione a opção e clique **Iniciar guia**. Há 3 segundos de preparação; a régua destaca somente a nota a tocar em amarelo. O guia ajusta faixa de frequência e afinação livre às notas, preservando calibração e lado das mãos. É possível pausar, retomar, repetir e transpor oitavas. A velocidade vai de **0 a 100%**, em passos de 1%, por campo numérico ou controle deslizante. Em 0%, o tempo fica congelado e a reprodução automática fica silenciosa; ao iniciar nessa velocidade, a primeira nota já aparece para treino.

**Ouvir música** reproduz a melodia selecionada com o timbre atual, sem câmera, respeitando velocidade, pausas, transposição e seção escolhida. Durante essa reprodução, as mãos ficam sem som. Use **Desligar som automático** para voltar a tocar com as mãos. Pausar o guia silencia a referência; encerrar, concluir sem repetição, trocar a música ou ocultar a aba fecha seu áudio.

A barra **Sua nota / Alvo** mostra a frequência tocada em relação à nota indicada pelo guia. **Suba +… cents** pede uma nota mais aguda; **Desça −… cents** pede uma mais grave. O centro indica o alvo, com tolerância de ±5 cents. A barra cobre ±100 cents; diferenças maiores continuam aparecendo no texto. Sem guia, ela indica a afinação em relação ao semitom mais próximo.

**The Ecstasy of Gold · partitura (solo)** usa uma redução monofônica dos 46 compassos do PDF de quatro páginas fornecido pelo usuário. A introdução usa o motivo repetido, sem a nota simultânea sustentada; acordes posteriores são reduzidos à nota superior e as entradas da voz móvel têm prioridade sobre acordes sustentados. Valores rítmicos, pausas e ligaduras estão codificados em `src/music/ecstasyScore.ts`, com identificação de página/compasso. Não é uma reprodução de todas as vozes do piano nem do arranjo do vídeo.

O PDF indica **Moderately**, sem BPM numérico. O andamento inicial de **96 BPM é uma escolha de estudo**, alterável. O prolongamento das duas fermatas finais também é configurável (padrão 2 × a duração escrita). Com essas escolhas, o guia completo dura 125 segundos, além da preparação. **Começar em** permite ir direto aos compassos 12, 24 ou 33. A bolinha amarela fica no topo da régua e destaca cada entrada; não há antecipação visual da nota seguinte. O centro da imagem não recebe a antiga faixa colorida do guia.

**Meu arquivo MIDI** importa localmente uma melodia com timing real do arquivo (formatos 0/1, PPQ, até 1 MB). Escolha a trilha/canal solo; notas simultâneas impedem iniciar essa trilha. Mudanças de andamento, pausas e durações são respeitadas. O arquivo fica na memória da sessão, sem upload ou persistência. Mute, calibração, parar a câmera ou ocultar a aba pausam o guia. É possível visualizar o guia sem ligar a câmera. Use MIDI exportado da linha melódica para treinar uma partitura completa; uma versão de piano com acompanhamento pode precisar de separação da voz principal antes da importação.

No modo legado Antenas fixas, a nota usa a ponta do dedo mais próxima da haste, entre polegar, indicador, médio, anelar e mínimo. O círculo no rastreamento identifica a ponta ativa. A calibração usa essa mesma distância; calibre novamente após esta atualização. Mover apenas a palma, mantendo as pontas paradas, não muda a nota. Não há mais deslocamento artificial de frequência pela abertura da mão. Por padrão, a esquerda controla a nota e a direita, o volume; Configurações permite inverter as mãos. O controle de volume mantém seu ponto configurável.

O modo legado usa **antenas fixas**, 220–880 Hz (duas oitavas), timbre com harmônicos, reverb discreto e afinação livre. Aproxime a mão de pitch da haste para subir a nota; afaste para descer. Abrir/fechar os dedos permite ajustes com a palma parada. Eleve a mão de volume acima do laço para aumentar a intensidade; baixe até o laço para silenciar. **Treino** seleciona o timbre com vibrato automático desligado e suavização curta. A pentatônica em Dó maior continua disponível e uma seleção anterior é preservada na atualização.

No modo legado de antenas, escolha **Treino**, inicie a câmera e use **Calibrar** para definir uma amplitude pequena e confortável. Mantenha os dedos relaxados ao calibrar pitch; na etapa de volume, baixe a mão até a altura desejada para silêncio. As etapas avançam e salvam sozinhas. No exercício **Sustentar uma nota**, mantenha o alvo por 2 segundos dentro de ±25 cents. Em **Intervalos e articulação**, depois de sustentar, silencie pelo laço durante pelo menos 250 ms: o próximo alvo aparece automaticamente. Perder o rastreamento não conta como articulação. Mute e calibração pausam o exercício.

A referência é [The Ecstasy of Gold — Theremin & Voice, Carolina Eyck](https://www.youtube.com/watch?v=ajM4vYCZMZk). A descrição identifica Etherwave Pro, voz, loop station, harmonizador e delay; o treino aqui é da linha solo, sem reproduzir essas camadas ou a partitura. O [manual do Etherwave](https://api.moogmusic.com/sites/default/files/2022-04/Etherwave-Theremin_Manual_2022.pdf) orienta as funções das antenas. A [técnica de Carolina Eyck](https://www.carolinaeyck.com/method) usa oito posições de dedos; esta webcam aproxima a abertura dos dedos, não reproduz esse método nem o campo elétrico do instrumento. O tamanho e a latência dos movimentos dependem do enquadramento e da câmera: não equivalem a centímetros ou à resposta física de um theremin.

**Livre** mantém frequência contínua para avaliar afinação. Assistida atrai suavemente a frequência para perto das notas sem criar degraus; cromática e pentatônica são quantizadas. A régua mostra posições com os dedos em postura intermediária, nota ativa e desvio em cents. Em **Configurações → Modo de controle**, é possível voltar aos eixos da tela. O brilho por altura da mão só se aplica nesse modo anterior.

**Treino**, **Melódico**, **Cordas** e **Etéreo** configuram timbre, faixa, afinação e efeitos sem alterar calibração, mão dominante ou ganho máximo. O timbre usa PeriodicWave normalizada com vários harmônicos; osciladores senoidal, triangular e serra continuam disponíveis. Pequenos movimentos de pitch permitem vibrato manual.

**Ouvir exemplo** toca uma frase de cerca de cinco segundos com o timbre escolhido, após clique, sem pedir câmera. O exemplo para automaticamente, ao clicar novamente ou ao ocultar a página; fica indisponível durante uma sessão de câmera. O ganho padrão permanece 0,18, limitado a 0,25. A configuração sonora antiga só é migrada automaticamente se ainda corresponder ao padrão original (senoide, modo livre, 110–1760 Hz); calibração e limite de ganho são preservados.

**Calibrar**, durante uma sessão, silencia temporariamente o instrumento e avança sem cliques: duas mãos visíveis por 2 segundos, preparação de 3 segundos e captura de 6 segundos para cada eixo. Mova a mão marcada **PITCH** na horizontal e a marcada **VOLUME** na vertical. A contagem pausa se a mão desaparecer; limites curtos são medidos novamente. Ao terminar, os limites são salvos automaticamente e o som é liberado. **Cancelar** sai sem aplicar a captura. **Configurações** permite editar limites, inversões, sensibilidade, suavização e invers?o das m?os. Os únicos dados persistidos são parâmetros em `localStorage`; gravações são mantidas em memória até baixar ou fechar a página.

Os rótulos PITCH/VOLUME são desenhados sobre as mãos. Se a classificação esquerda/direita for incerta ou duplicada, o modo automático usa as metades da tela para atribuir as funções. A confiança dessa classificação não é tratada como confiança na existência da mão: detecção e presença continuam protegidas pelos limiares do MediaPipe. Elevar a mão VOLUME aumenta o ganho; retirar essa mão silencia. Mensagens de tracking e avisos têm espaço reservado para evitar deslocamentos no layout.

O vídeo original não é espelhado ao entrar no modelo. A imagem exibida recebe `scaleX(-1)`; landmarks e mapeamento usam `xExibido = 1 - xModelo`, com `y` inalterado. O centro da palma é a média dos landmarks 0, 5, 9, 13 e 17. O indicador experimental usa landmark 8. A convenção selfie do classificador é corrigida para o vídeo não espelhado. Se o dispositivo apresentar orientação diferente, use **Identificação manual**: uma mão em cada metade da tela, pitch à direita e volume à esquerda. Canhoto troca as funções. Não cruze as metades nesse modo.

Pitch: `fMin * (fMax / fMin) ** t`. Volume: `t² * ganhoMáximo`. Ambos recebem EMA adaptativa; o áudio usa `setTargetAtTime`, fora do ciclo de renderização React. Sem mão de volume, o ganho vai a zero. Sem pitch, a frequência anterior dura no máximo 150 ms antes do fade. Um watchdog e automação previamente agendada no relógio do áudio protegem contra frames parados. A retomada usa ataque suave. Trocar de aba silencia; duas mãos e frames válidos são necessários para retomar.

## Assets e licenças

`public/mediapipe/` contém modelo float16 versão 1, loaders JS, WASM, licença Apache-2.0 e `PROVENANCE.json` com versão e SHA-256. O pacote está fixado em **0.10.21**: a versão 1.1.1 foi descartada após o teste identificar telemetria externa. A CSP permite conexões somente à origem da aplicação. Inclua esses arquivos no Git; não são baixados durante uso ou build. Para restaurar/atualizar intencionalmente a cópia após instalar dependências:

```sh
npm run assets
```

Esse comando de desenvolvimento precisa de internet. Origem: [modelo oficial](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task), pacote `@mediapipe/tasks-vision` e [MediaPipe](https://github.com/google-ai-edge/mediapipe). Consulte a [API oficial do Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js). Código da aplicação: MIT; assets de terceiros mantêm licença própria.

## GitHub Pages

1. Envie o projeto e assets a um repositório GitHub, branch `main`.
2. Em Settings → Pages, selecione **GitHub Actions**.
3. O workflow valida lint, tipos, testes e build antes do deploy. Repositórios comuns usam automaticamente `/NOME-DO-REPO/`; `USUARIO.github.io` usa `/`.
4. Para domínio próprio, defina a variável de repositório `VITE_BASE_PATH` como `/` e configure o domínio em Pages. Outra base também pode ser explicitamente definida nessa variável.

Build manual para subdiretório no PowerShell:

```powershell
$env:VITE_BASE_PATH='/Theremin/'
npm.cmd run build
npm.cmd run preview
```

Abra `http://localhost:4173/Theremin/`. Em bash: `VITE_BASE_PATH=/Theremin/ npm run build`. Modelo, WASM e demais assets respeitam `import.meta.env.BASE_URL`. A aplicação tem uma única rota, sem roteamento dependente de servidor.

As versões de Actions foram conferidas nos repositórios oficiais: [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact), [deploy-pages](https://github.com/actions/deploy-pages).

Se não puder usar o workflow, construa com a base correta e copie **o conteúdo de `dist`** para a raiz de uma branch `gh-pages` dedicada (não substitua o código-fonte). Inclua `.nojekyll` e configure Pages para publicar essa branch. Esse método exige reconstrução e cópia a cada mudança; somente arquivos estáticos são publicados. Se a organização desabilitar Pages ou o processo de build de Pages, a alternativa é hospedar `dist` em outro servidor estático HTTPS.

## Limitações e diagnóstico

- Webcam exige HTTPS ou localhost. `file://` não é suportado. Se negar a permissão, libere-a na barra de endereço. Se ocupada, feche outros programas. Ausência e desconexão têm mensagens próprias.
- WebAssembly, Web Audio e getUserMedia são necessários. GPU é tentada primeiro e CPU é fallback. Inferência pesada reduz a taxa para aproximadamente 15 FPS. FPS e tempo de inferência são medidos; **não representam latência total**. Inferência síncrona pode bloquear brevemente a UI em hardware lento.
- A câmera solicita 1280×720, com fallback 640×480 em falhas compatíveis. A proporção se ajusta à resolução/orientação real. O desempenho depende de luz, oclusão, CPU/GPU e bateria. Use **Parar** quando não estiver tocando.
- Safari/iOS pode suspender áudio por regras do sistema; se não retomar, pare e inicie com um novo clique. Formato de gravação depende de MediaRecorder (WebM/Opus, MP4 ou Ogg). Downloads não são salvos automaticamente.
- Fones Bluetooth acrescentam atraso externo, que não é medido pela aplicação. Não é prometida latência específica nem ausência de cliques em todo hardware.
- Testes automatizados não substituem tocar com mãos reais e ouvir o resultado. Consulte `VALIDATION.md` para o que foi efetivamente verificado.

## Estrutura e escopo

`src/audio`: síntese e segurança; `src/vision`: MediaPipe; `src/mapping`: matemática e suavização; `src/hooks`: câmera e ciclo de vida; `src/components`: calibração e configurações; `src/app`: interface. `tests` cobre mapeamento, perda de tracking, persistência e erros simulados.

Fases 1–5 implementadas, com gravação local e presets da fase 6. PWA instalável e MIDI são extensões futuras opcionais previstas na spec, não requisitos do MVP. Não há service worker nem promessa de funcionamento offline na primeira visita.
