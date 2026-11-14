# Queda de FPS nas bordas — 14/11/2026

## Causa confirmada

O cache LRU de imagens das árvores tem limite de 16 MiB e usa uma imagem distinta por árvore. Nas bordas superior e inferior, as três fileiras de árvores gigantes visíveis exigem aproximadamente 19,9 MiB em DPR 1. Como não cabem juntas, a varredura em ordem fixa expulsa imagens que serão necessárias logo depois: após o aquecimento, 100% das solicitações continuam recriando imagens a cada frame.

As bordas são geradas em `WorldProps.generateForest`, com três fileiras, espaçamento de 72 unidades e árvores de tamanho 150–250. A câmera de 1280 × 720 alcança mais árvores ao longo de uma borda horizontal que de uma vertical. O teste de visibilidade também inclui uma margem proporcional ao tamanho das árvores.

O problema está na interação de `renderTrees` com `getTreeSprite`, não na quantidade de inimigos: o ensaio abaixo removeu inimigos e congelou a atualização da lógica, mantendo a renderização completa em RAF.

## Medições

Build de produção do checkout atual, Edge headless, viewport 1280 × 720, CPU nativa, seed 123456789. Centro (0,0), topo/base (0,±6700), laterais (±6700,0). Cada posição teve 1,2 segundo de aquecimento e 4 segundos de coleta. O áudio foi silenciado e cada posição foi mantida fixa.

| Posição, DPR 1 | Árvores visíveis | Imagens necessárias | Falhas de cache | FPS médio | Render das árvores |
| --- | ---: | ---: | ---: | ---: | ---: |
| Centro | 1 | <0,1 MiB | 0% | 144,0 | 0,23 ms |
| Topo | 74 | 19,9 MiB | 100% | 68,3 | 4,61 ms |
| Base | 74 | 19,9 MiB | 100% | 65,9 | 4,73 ms |
| Esquerda | 49 | 13,3 MiB | 0% | 144,0 | 0,33 ms |
| Direita | 49 | 13,3 MiB | 0% | 144,0 | 0,32 ms |

## Confirmação por alteração isolada

Na sessão do navegador, o ensaio elevou temporariamente o orçamento para 128 MiB, limpou o cache e repetiu topo/base. Não houve mudança no código do jogo nem na geometria.

- DPR 1: topo e base voltaram a 144 FPS, com 0% de falhas de cache e renderização das árvores de aproximadamente 0,32–0,33 ms.
- DPR 2: as mesmas 74 árvores precisam de 79,4 MiB. O limite original também apresentou 100% de falhas. Com orçamento ampliado, ambas as bordas voltaram a 144 FPS, com 0% de falhas e aproximadamente 0,48–0,54 ms no desenho das árvores.
- Em DPR 2, até as laterais passam a exceder o limite: cerca de 53,4 MiB para 49 árvores.

Os contextos de DPR 1/2 foram executados sequencialmente no mesmo processo de navegador. Houve variação de custo fora de `renderTrees` entre posições em DPR 2; não se deve interpretar seus FPS isolados como comparação rigorosa de posição. A repetição na mesma borda, a contagem de recriações e a reversão ao ampliar o cache sustentam o diagnóstico. Não houve exceções de página.

Tempos de métodos medem JavaScript/submissão ao Canvas; não incluem isoladamente todo o trabalho posterior de rasterização/composição. As amostras são curtas e não estimam desempenho universal de hardware.

## Correção indicada

Pré-renderizar o cenário estático da borda em blocos reutilizáveis, com orçamento de memória e tratamento de bordas entre blocos. Isso evita guardar dezenas de imagens grandes e sobrepostas para apresentar uma faixa estreita de floresta. Colisões devem continuar usando os mesmos troncos e posições.

O cache também precisa evitar uma cascata de expulsões do conjunto visível. Apenas elevar o orçamento para 128 MiB confirmou a causa; não é a solução recomendada como padrão para aparelhos com pouca memória. Quantização de tamanho/tom para compartilhar sprites é outra opção, mas altera detalhes visuais e precisa de comparação de imagem.

Nesta investigação foram adicionados o diagnóstico e o ensaio reproduzível, sem alterações no jogo.

Dados: [performance-map-edges.json](./performance-map-edges.json). Ensaio: [profile-map-edges.mjs](../scripts/profile-map-edges.mjs).

```powershell
# Com build de produção servido em localhost:3010 e Playwright disponível:
node scripts/profile-map-edges.mjs
```
