# Nivelamento das músicas do menu

As três faixas cadastradas na seleção de personagem foram medidas integralmente, com ponderação K e blocos de 400 ms/75% de sobreposição, conforme o algoritmo de loudness da [ITU-R BS.1770-5](https://www.itu.int/rec/R-REC-BS.1770-5-202311-I). A análise usa decodificação e filtragem offline em 48 kHz, reproduzindo a saída estéreo. Não faz análise durante o jogo.

| Personagem | Loudness da faixa | Ganho antigo | Ganho novo | Loudness corrigido a 100% |
| --- | ---: | ---: | ---: | ---: |
| Kayru | −21,83 LUFS | 1 | 1 | −21,83 LUFS |
| Derson | −10,20 LUFS | 0,5 | 0,262305 | −21,83 LUFS |
| Lula | −7,76 LUFS | 0,5 | 0,197913 | −21,83 LUFS |

O alvo foi a faixa mais baixa, sem amplificar nenhum arquivo. O ganho por faixa é multiplicado pelo volume escolhido pelo usuário: em 50%, as três ficam perto de −27,85 LUFS. Volume zero continua silencioso e a preferência persistida continua sendo o valor do controle, não o ganho técnico por faixa.

Os MP3 originais foram preservados. O ajuste só afeta as músicas de seleção do menu. Duração, conteúdo e controles de reprodução permanecem iguais.

O algoritmo mede loudness integrado da faixa inteira; diferenças de dinâmica dentro das músicas continuam existindo. Foram medidos picos de amostras, não true peak. Após a atenuação, os picos de amostra ficam abaixo de −5,7 dBFS a 100%, com margem adicional em volumes menores.

Dados: [menu-audio-levels.json](./menu-audio-levels.json). Para repetir a análise com o servidor de produção ativo e Playwright disponível, executar `node scripts/analyze-menu-audio.mjs` usando a mesma configuração de `PLAYWRIGHT_MODULE` dos ensaios existentes.
