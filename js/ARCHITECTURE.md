# Rampage JavaScript Architecture — v1.5.1

A ordem dos scripts no `index.html` é intencional porque o projeto ainda usa funções globais para manter compatibilidade com o gameplay existente.

## `core/bootstrap.js`
Responsável por inicialização global e entrada básica.
- Canvas / resolução base
- Desktop/mobile detection
- Teclado e D-pad
- Estado global da partida
- Configuração das 10 fases (`LEVELS`)
- `levelCfg()` / `getBoss()`

## `gameplay/gameplay.js`
Regras principais do jogo.
- Criação do monstro
- Prédios, inimigos e partículas
- Combate e dano
- XP / combo
- Atualização de monstro e inimigos
- Power-ups
- Vitória / derrota
- Loop base da partida

## `render/canvas-renderer.js`
Fallback e cenário 2D via Canvas.
- Render do céu e cenário
- Prédios e destruição
- Personagens em fallback
- Partículas e power-ups
- HUD visual do mundo
- Pause base

## `systems/progression.js`
Sistemas persistentes e evolução.
- LocalStorage / save
- Monstros e desbloqueios
- Áudio procedural e SFX
- Upgrades
- Civis
- Temas e bosses adicionais
- Gamepad
- Progressão de campanha

## `content/campaign.js`
Conteúdo e regras específicas das 10 fases.
- Paletas e variações de cidade
- Objetivos por fase
- Habilidades especiais
- Agarrar / arremessar
- Skins / galeria
- Menu de gráficos
- Menu principal e telas de resultado

## `systems/runtime.js`
Camada moderna do runtime.
- `GameState`
- Loading entre fases
- Pause real
- Qualidade AUTO/LEVE/MÉDIO/FORTE
- Detecção de hardware/FPS
- Orçamento de partículas e civis
- Ajuste dinâmico de resolução

## `render/pixi-renderer.js`
Render acelerado por GPU.
- Inicialização PixiJS
- Cache de imagens/texturas
- Sprites dos monstros
- Sprites dos inimigos e bosses
- Animações por estado
- Culling fora da tela
- Fallback automático para Canvas

## Regra para futuras funções
- Física/combate: `gameplay/`
- Desenho Canvas: `render/canvas-renderer.js`
- Pixi/sprites: `render/pixi-renderer.js`
- Save/XP/desbloqueios: `systems/progression.js`
- Loading/pause/performance: `systems/runtime.js`
- Conteúdo de fase/menu/objetivo: `content/campaign.js`
- Inicialização/input/configuração global: `core/bootstrap.js`


## Assets de sprites — 1.5.1

O runtime não deve mais apontar diretamente para arquivos soltos. Use `window.RAMPAGE_SPRITES`, definido em `assets/sprites_v2/sprite-catalog.js`.
Os JSONs em `assets/sprites_v2/manifests/` são a fonte legível de metadados. Atlases em `assets/sprites_v2/atlases/` ficam disponíveis para uma futura troca do carregador sem reorganizar os assets novamente.
