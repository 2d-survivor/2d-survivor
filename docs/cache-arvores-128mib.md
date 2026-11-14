# Cache de árvores ampliado — 14/11/2026

O limite padrão do LRU em WorldProps passou de 16 para 128 MiB RGBA. As imagens continuam sendo criadas sob demanda. Nenhuma mudança em posições, colisões ou geometria das árvores.

## Teste do limite real do jogo

O ensaio agora usa por padrão o orçamento configurado no jogo, sem sobrescrevê-lo no navegador, e mantém o cache entre posições. Foram testados centro, quatro bordas, dois cantos e retorno ao centro, em DPR 1 e 2: 16 amostras sem erros de página, sem falhas de cache após aquecimento e com contador de imagens dentro de 128 MiB.

| Posição | DPR | FPS antes (16 MiB) | FPS agora (128 MiB) | Falhas de cache agora |
| --- | ---: | ---: | ---: | ---: |
| top | 1 | 61,5 | 144,0 | 0 |
| bottom | 1 | 65,4 | 144,0 | 0 |
| top-right | 1 | — | 144,0 | 0 |
| bottom-left | 1 | — | 144,0 | 0 |
| top | 2 | 45,2 | 144,0 | 0 |
| bottom | 2 | 50,2 | 144,0 | 0 |
| top-right | 2 | — | 144,0 | 0 |
| bottom-left | 2 | — | 144,0 | 0 |

As 74 árvores de topo/base exigem aproximadamente 19,9 MiB em DPR 1 e 79,4 MiB em DPR 2; os cantos testados alcançam 87 árvores e cerca de 94 MiB em DPR 2. O orçamento anterior não comportava o conjunto visível.

## CPU limitada em 4×

| Posição | DPR | FPS médio | Desenho de árvores, ms |
| --- | ---: | ---: | ---: |
| top | 1 | 137,5 | 1,2 |
| bottom | 1 | 134,5 | 1,2 |
| top | 2 | 122,0 | 2,1 |
| bottom | 2 | 118,8 | 2,1 |

Essas quatro amostras também usaram o limite real de 128 MiB, com zero falhas de cache após aquecimento e zero erros de página. A limitação de CPU por CDP não simula pouca RAM nem uma GPU física de entrada.

## Memória e limites

Ao visitar todas as posições sem limpar o cache, o contador de imagens chegou a 127,7 MiB. Imagens antigas permanecem no LRU até serem substituídas ou o mundo ser descartado. Portanto o uso pode se aproximar de 128 MiB durante a navegação, embora não seja reservado inteiro ao iniciar. Esse contador de RGBA não mede todo o custo nativo/CPU/GPU mantido pelo navegador.

O teste recompilou produção e usou Edge headless, 1280 × 720, seed fixa, 1,2 s de aquecimento e 4 s de coleta por posição. Sem inimigos, com lógica congelada e áudio silenciado, para isolar a renderização. Os resultados não representam um combate completo nem garantem desempenho em aparelhos físicos com pouca memória. A criação inicial de imagens antes do aquecimento não foi caracterizada por essas amostras.

Outras regiões em DPR 2 ainda mostraram custos de renderização fora do cache de árvores: centro perto de 34 FPS e laterais entre 37 e 39 FPS, mesmo sem falhas de cache. O problema de recriação contínua das árvores de topo/base foi resolvido nestes ensaios; eles não demonstram 144 FPS em todo o mapa. Os contextos de DPR foram sequenciais no mesmo navegador, como no diagnóstico anterior.

Build, TypeScript sem emissão e lint passaram; lint com dois avisos preexistentes de parâmetro não usado em WeaponSystem.ts.

Dados: [CPU nativa](./performance-map-edges-128mib.json) e [CPU limitada](./performance-map-edges-128mib-cpu4.json). Ensaio: [profile-map-edges.mjs](../scripts/profile-map-edges.mjs).

Variáveis opcionais do ensaio: EDGE_REPORT escolhe arquivo, EDGE_CPU_RATE escolhe limitação de CPU e EDGE_REGIONS filtra posições. EDGE_COMPARE_BUDGETS=1 habilita o diagnóstico antigo que sobrescreve o orçamento com 16/128 MiB; o padrão atual valida o valor do jogo.
