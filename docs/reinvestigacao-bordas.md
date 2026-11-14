# Reinvestigação das bordas — 14/11/2026

Não foi observada melhora do gargalo nas bordas superior/inferior no checkout atual. A cadeia de recriação e expulsão de imagens permanece ativa, com 100% de falhas no cache de árvores nessas bordas.

Repetição do mesmo ensaio: produção recompilada, Edge headless, CPU nativa, viewport 1280 × 720, mesma seed, posições, 1,2 s de aquecimento e 4 s de coleta por posição. Sem inimigos e com a atualização da lógica congelada para isolar renderização. Nenhuma modificação no código do jogo foi aplicada nesta tarefa. Build passou; os 14 cenários terminaram sem exceções de página.

| Posição | DPR | Cache MiB | FPS anterior | FPS atual | Falhas atuais |
| --- | ---: | ---: | ---: | ---: | ---: |
| center | 1 | 16 | 144,0 | 144,0 | 0,0% |
| top | 1 | 16 | 68,3 | 61,5 | 100,0% |
| bottom | 1 | 16 | 65,9 | 65,4 | 100,0% |
| left | 1 | 16 | 144,0 | 144,0 | 0,0% |
| right | 1 | 16 | 144,0 | 144,0 | 0,0% |
| top-large-cache-diagnostic | 1 | 128 | 144,0 | 144,0 | 0,0% |
| bottom-large-cache-diagnostic | 1 | 128 | 144,0 | 144,0 | 0,0% |
| center | 2 | 16 | 32,5 | 33,3 | 0,0% |
| top | 2 | 16 | 44,9 | 45,2 | 100,0% |
| bottom | 2 | 16 | 50,8 | 50,2 | 100,0% |
| left | 2 | 16 | 26,7 | 26,5 | 100,0% |
| right | 2 | 16 | 24,7 | 26,1 | 100,0% |
| top-large-cache-diagnostic | 2 | 128 | 144,0 | 144,0 | 0,0% |
| bottom-large-cache-diagnostic | 2 | 128 | 144,0 | 144,0 | 0,0% |

O código continua com orçamento de 16 MiB por mundo. As 74 árvores visíveis no topo/base exigem 19,9 MiB em DPR 1 e 79,4 MiB em DPR 2. As laterais mostram 49 árvores, exigindo 13,3 MiB / 53,4 MiB. Isso explica por que as laterais cabem no cache em DPR 1 e topo/base não.

A ampliação temporária para 128 MiB, somente no navegador de teste, novamente eliminou as falhas e levou topo/base a 144 FPS. A correção recomendada continua sendo cache de blocos estáticos das bordas e política que evite expulsar/recriar todo o conjunto visível, com memória limitada. Não foi aplicada essa correção nem ampliado o orçamento padrão.

As amostras são curtas; pequenas diferenças de FPS não permitem afirmar regressão causal. Os contextos de DPR foram sequenciais no mesmo navegador, e valores fora do custo das árvores podem sofrer pressão de recursos entre cenários. A conclusão se apoia na repetição de 100% de falhas, no conjunto visível acima do orçamento e no teste de alteração isolada do cache.

Dados novos: [performance-map-edges-recheck.json](./performance-map-edges-recheck.json). Diagnóstico anterior e método: [queda-fps-bordas.md](./queda-fps-bordas.md).
