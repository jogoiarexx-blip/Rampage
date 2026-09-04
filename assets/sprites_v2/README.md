# Rampage Sprite Library — 1.5.1

Estrutura organizada por responsabilidade:

- `player/<monstro>/<animacao>/` — frames dos personagens jogáveis.
- `enemies/<tipo>/<animacao>/` — inimigos e veículos.
- `bosses/<boss>/<animacao>/` — chefes.
- `effects/combat/` — efeitos individuais.
- `manifests/` — metadados separados por categoria.
- `atlases/` — atlases PNG + JSON pré-gerados para PixiJS.
- `sprite-catalog.js` — catálogo carregável por `<script>`, compatível com execução via `file://`.

Os manifests incluem FPS, loop e anchor. O renderer atual usa o catálogo JS para não depender de `fetch()` quando o jogo é aberto com dois cliques.
