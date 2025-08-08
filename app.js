/*
 * Gerador de Escalas para Baixo/Guitarra
 *
 * Esta aplicação foi desenvolvida para gerar diagramas de escalas menor natural
 * e menor harmônica para instrumentos de cordas entre 4 e 8 cordas. O usuário
 * escolhe a quantidade de cordas, informa a afinação desejada (inclusive
 * variações como Drop D) e seleciona a tonalidade e o tipo de escala. O
 * resultado inclui a lista de notas da escala e um diagrama interativo do
 * braço do instrumento com 12 casas. Ao passar o mouse sobre cada casa,
 * aparece o nome da nota correspondente. A tônica da escala é destacada com
 * uma cor diferente. Opcionalmente o usuário pode copiar a saída em formato
 * JSON para uso externo.
 */

const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

// Mapeamento das notas básicas para números de semitons (C=0).
const baseSemitoneMap = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/**
 * Converte um nome de nota (por exemplo "C", "F#", "Bb", "E#") em um
 * número de semitom entre 0 e 11. Suporta sustenidos múltiplos (##) e bemóis
 * múltiplos (bb). As letras minúsculas são normalizadas para maiúsculas.
 * @param {string} note Nome da nota.
 * @returns {number|null} Índice de semitom ou null se inválido.
 */
function parseNoteToSemitone(note) {
  if (!note) return null;
  let n = note.trim();
  if (n.length === 0) return null;
  // Normaliza símbolos unicode ♭/♯ para b/# e tudo em maiúsculas
  n = n.replace(/♭/g, 'b').replace(/♯/g, '#').toUpperCase();
  const base = n.charAt(0);
  if (!baseSemitoneMap.hasOwnProperty(base)) return null;
  let semitone = baseSemitoneMap[base];
  // Processa cada caracter após a letra base
  for (let i = 1; i < n.length; i++) {
    const ch = n.charAt(i);
    if (ch === '#') {
      semitone += 1;
    } else if (ch === 'B') {
      semitone -= 1;
    } else {
      // Caracteres desconhecidos invalidam a nota
      return null;
    }
  }
  // Ajusta para dentro de 0-11
  semitone = ((semitone % 12) + 12) % 12;
  return semitone;
}

// Listas de nomes de notas com sustenido para exibição padrão
const noteNamesSharp = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

// Dicionário das escalas menor natural para cada semitom de tonalidade.
// Cada entrada contém as notas na ordem apropriada (sem repetir a oitava).
const naturalMinorScales = {
  0: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],      // C menor
  1: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],      // C# menor
  2: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'],         // D menor
  3: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'Db'],    // Eb menor (em vez de D#)
  4: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],         // E menor
  5: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'Eb'],      // F menor
  6: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],       // F# menor
  7: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F'],        // G menor
  8: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'Gb'],   // Ab menor (em vez de G#)
  9: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],          // A menor
  10: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'Ab'],    // Bb menor (em vez de A#)
  11: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],       // B menor
};

// Dicionário das escalas menor harmônica para cada semitom de tonalidade.
const harmonicMinorScales = {
  0: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'],        // C harmônica
  1: ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B#'],     // C# harmônica
  2: ['D', 'E', 'F', 'G', 'A', 'Bb', 'C#'],        // D harmônica
  3: ['Eb', 'F', 'Gb', 'Ab', 'Bb', 'Cb', 'D'],     // Eb harmônica
  4: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'],        // E harmônica
  5: ['F', 'G', 'Ab', 'Bb', 'C', 'Db', 'E'],       // F harmônica
  6: ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E#'],      // F# harmônica
  7: ['G', 'A', 'Bb', 'C', 'D', 'Eb', 'F#'],       // G harmônica
  8: ['Ab', 'Bb', 'Cb', 'Db', 'Eb', 'Fb', 'G'],    // Ab harmônica (em vez de G#)
  9: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],         // A harmônica
  10: ['Bb', 'C', 'Db', 'Eb', 'F', 'Gb', 'A'],     // Bb harmônica
  11: ['B', 'C#', 'D', 'E', 'F#', 'G', 'A#'],      // B harmônica
};

// Afinações padrão para instrumentos de 4 a 8 cordas (da mais grave para a mais aguda).
const standardTunings = {
  4: ['E', 'A', 'D', 'G'],
  5: ['B', 'E', 'A', 'D', 'G'],
  6: ['E', 'A', 'D', 'G', 'B', 'E'],
  7: ['B', 'E', 'A', 'D', 'G', 'B', 'E'],
  8: ['F#', 'B', 'E', 'A', 'D', 'G', 'B', 'E'],
};

/**
 * Processa a entrada de afinação do usuário. Pode ser uma lista de notas
 * separadas por espaço (por exemplo "E A D G B E") ou um formato "Drop X"
 * (por exemplo "Drop D", "Drop C#"). Para "Drop", a primeira corda da
 * afinação padrão é substituída pela nota fornecida. Retorna um array de
 * strings com tamanho igual ao número de cordas ou null se inválido.
 * @param {string} input Afinação informada pelo usuário
 * @param {number} numStrings Quantidade de cordas
 * @returns {string[]|null}
 */
function parseTuning(input, numStrings) {
  if (!input) return null;
  const trimmed = input.trim();
  if (/^drop\s+/i.test(trimmed)) {
    // Afinação do tipo Drop X
    const parts = trimmed.split(/\s+/);
    // Espera-se que a segunda palavra seja a nota de drop
    if (parts.length < 2) return null;
    const dropNote = parts[1].toUpperCase().replace(/♭/g, 'b').replace(/♯/g, '#');
    const baseTuning = standardTunings[numStrings];
    if (!baseTuning) return null;
    const result = baseTuning.slice();
    result[0] = dropNote;
    return result;
  }
  // Afinação listada explicitamente
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length !== numStrings) {
    return null;
  }
  return tokens.map((t) => t.toUpperCase().replace(/♭/g, 'b').replace(/♯/g, '#'));
}

/**
 * Gera o diagrama da escala para a afinação e tonalidade fornecidas.
 * Retorna um objeto contendo a lista de notas da escala (como strings) e
 * o braço com as notas em cada casa. Caso ocorra algum erro de parsing,
 * retorna null.
 * @param {number} numStrings
 * @param {string[]} tuningArray
 * @param {string} rootNote
 * @param {'natural'|'harmonic'} scaleType
 * @returns {{scale: string[], fretboard: Array<Array<[string, boolean]>>, error?: string}|null}
 */
function generateScaleDiagram(numStrings, tuningArray, rootNote, scaleType) {
  // Converte a tonalidade em semitom
  const rootSemitone = parseNoteToSemitone(rootNote);
  if (rootSemitone === null) {
    return { error: 'Tonalidade inválida.' };
  }
  // Obtém a lista de notas da escala correta
  let scaleNotes;
  if (scaleType === 'natural') {
    scaleNotes = naturalMinorScales[rootSemitone];
  } else if (scaleType === 'harmonic') {
    scaleNotes = harmonicMinorScales[rootSemitone];
  } else {
    return { error: 'Tipo de escala inválido.' };
  }
  if (!scaleNotes) {
    return { error: 'Escala não encontrada.' };
  }
  // Converte as notas da escala para semitons para verificação
  const scaleSemitones = scaleNotes.map((n) => parseNoteToSemitone(n));
  // Número de casas a serem exibidas (0 a 12 = 13 posições)
  // Geramos apenas as casas 1–12 (12 posições) para evitar duplicação da casa aberta,
  // pois a nota aberta já é indicada no rótulo da corda. A coluna 0 não faz parte do diagrama.
  const fretCount = 12;
  const fretboard = [];
  for (let s = 0; s < numStrings; s++) {
    const openNote = tuningArray[s];
    const openSemitone = parseNoteToSemitone(openNote);
    if (openSemitone === null) {
      return { error: `Nota de afinação inválida: ${openNote}` };
    }
    const stringRow = [];
    // Casas de 1 a 12
    for (let fret = 1; fret <= fretCount; fret++) {
      const noteSemitone = (openSemitone + fret) % 12;
      const noteNameDisplay = noteNamesSharp[noteSemitone];
      const inScale = scaleSemitones.includes(noteSemitone);
      stringRow.push([noteNameDisplay, inScale]);
    }
    fretboard.push(stringRow);
  }
  return { scale: scaleNotes, fretboard, rootSemitone, scaleSemitones };
}

function App() {
  const [numStrings, setNumStrings] = useState(6);
  // Guarda as notas de afinação de cada corda individualmente
  const [tuningNotes, setTuningNotes] = useState(standardTunings[6].slice());
  const [rootNote, setRootNote] = useState('C');
  const [scaleType, setScaleType] = useState('harmonic');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Atualiza as notas de afinação quando a quantidade de cordas muda
  useEffect(() => {
    const base = standardTunings[numStrings];
    if (base) {
      setTuningNotes(base.slice());
    }
  }, [numStrings]);

  // Atualiza uma nota específica da afinação
  const handleTuningChange = (index, value) => {
    setTuningNotes((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  };

  const handleGenerate = () => {
    // Verifica se todas as notas de afinação são válidas
    for (const note of tuningNotes) {
      if (parseNoteToSemitone(note) === null) {
        setError(`Nota de afinação inválida: ${note}`);
        setResult(null);
        return;
      }
    }
    const diag = generateScaleDiagram(numStrings, tuningNotes, rootNote, scaleType);
    if (diag && diag.error) {
      setError(diag.error);
      setResult(null);
      return;
    }
    setError(null);
    setResult(diag);
  };

  // Copia o JSON para a área de transferência
  const handleCopyJson = () => {
    if (!result) return;
    const simplified = {
      scale: result.scale,
      fretboard: result.fretboard,
    };
    const jsonStr = JSON.stringify(simplified, null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(jsonStr)
        .then(() => {
          alert('Diagrama copiado para a área de transferência!');
        })
        .catch(() => {
          alert('Não foi possível copiar o diagrama.');
        });
    } else {
      alert('Funcionalidade de copiar não suportada neste navegador.');
    }
  };

  return React.createElement(
    'div',
    { className: 'container' },
    [
      React.createElement('h1', { key: 'title' }, 'Gerador de Escalas – Menor & Menor Harmônica'),
      // Controles principais
      React.createElement(
        'div',
        { key: 'controls', className: 'controls' },
        [
          // Número de cordas
          React.createElement(
            'div',
            { key: 'numStrings' },
            [
              React.createElement('label', { htmlFor: 'numStrings', key: 'label' }, 'Cordas (4–8)'),
              React.createElement('input', {
                key: 'input',
                id: 'numStrings',
                type: 'number',
                min: 4,
                max: 8,
                value: numStrings,
                onChange: (e) => setNumStrings(Number(e.target.value)),
              }),
            ],
          ),
          // Afinação – lista de selects para cada corda exibidos verticalmente e invertidos (mais aguda em cima)
          React.createElement(
            'div',
            { key: 'tuning' },
            [
              React.createElement('label', { key: 'label' }, 'Afinação'),
              React.createElement(
                'div',
                { key: 'selects', className: 'tuning-selects' },
                // Percorre as cordas de cima (mais aguda) para baixo (mais grave)
                tuningNotes
                  .map((note, idx) => ({ note, idx }))
                  .sort((a, b) => a.idx === b.idx ? 0 : b.idx - a.idx)
                  .map(({ note, idx }, displayIndex) =>
                    React.createElement(
                      'div',
                      { key: `tuning-row-${idx}`, className: 'tuning-row' },
                      [
                        // Número da corda (1 no topo)
                        React.createElement('span', { key: 'num', className: 'string-number' }, displayIndex + 1),
                        React.createElement(
                          'select',
                          {
                            key: 'select',
                            value: note,
                            onChange: (e) => handleTuningChange(idx, e.target.value),
                          },
                          noteNamesSharp.map((opt) =>
                            React.createElement('option', { key: opt, value: opt }, opt),
                          ),
                        ),
                      ],
                    ),
                  ),
              ),
            ],
          ),
          // Tonalidade
          React.createElement(
            'div',
            { key: 'root' },
            [
              React.createElement('label', { htmlFor: 'root', key: 'label' }, 'Tonalidade'),
              React.createElement(
                'select',
                {
                  key: 'select',
                  id: 'root',
                  value: rootNote,
                  onChange: (e) => setRootNote(e.target.value),
                },
                noteNamesSharp.map((note) =>
                  React.createElement('option', { key: note, value: note }, note),
                ),
              ),
            ],
          ),
          // Tipo de escala
          React.createElement(
            'div',
            { key: 'scaleType' },
            [
              React.createElement('label', { htmlFor: 'scaleType', key: 'label' }, 'Tipo de Escala'),
              React.createElement(
                'select',
                {
                  key: 'select',
                  id: 'scaleType',
                  value: scaleType,
                  onChange: (e) => setScaleType(e.target.value),
                },
                [
                  React.createElement('option', { key: 'natural', value: 'natural' }, 'Menor Natural'),
                  React.createElement('option', { key: 'harmonic', value: 'harmonic' }, 'Menor Harmônica'),
                ],
              ),
            ],
          ),
          // Botão Gerar
          React.createElement(
            'div',
            { key: 'button' },
            [
              React.createElement(
                'button',
                { key: 'generateBtn', className: 'generate', onClick: handleGenerate },
                'Gerar Escala',
              ),
            ],
          ),
        ],
      ),
      // Mensagem de erro
      error
        ? React.createElement(
            'div',
            { key: 'error', style: { color: '#ff4f9a', marginTop: '1rem' } },
            error,
          )
        : null,
      // Resultados
      result
        ? React.createElement(
            'div',
            { key: 'results', className: 'results' },
            [
              React.createElement(
                'div',
                { key: 'scaleList', className: 'scale-list' },
                [
                  React.createElement(
                    'strong',
                    { key: 'title' },
                    `Notas da escala (${scaleType === 'natural' ? 'Menor Natural' : 'Menor Harmônica'}): `,
                  ),
                  result.scale.join(', '),
                ],
              ),
              // Botão de cópia
              React.createElement(
                'button',
                { key: 'copyBtn', className: 'copy', onClick: handleCopyJson },
                'Copiar JSON',
              ),
              // Tabela do braço
              React.createElement(
                'table',
                { key: 'table', className: 'fretboard' },
                [
                  // Cabeçalho com casas (sem o 0, começa em 1)
                  React.createElement(
                    'thead',
                    { key: 'thead' },
                    React.createElement(
                      'tr',
                      { key: 'tr' },
                      [
                        React.createElement('th', { key: 'blank' }, ''),
                        ...Array.from({ length: 12 }, (_, idx) =>
                          React.createElement('th', { key: idx }, idx + 1),
                        ),
                      ],
                    ),
                  ),
                  React.createElement(
                    'tbody',
                    { key: 'tbody' },
                    // Renderiza linhas invertidas (mais aguda no topo)
                    result.fretboard
                      .map((row, idx) => ({ row, idx }))
                      .sort((a, b) => b.idx - a.idx)
                      .map(({ row, idx }, displayIndex) =>
                        React.createElement(
                          'tr',
                          { key: `string-${idx}` },
                          [
                            // Rótulo da corda invertido
                            React.createElement(
                              'th',
                              { key: `label-${idx}` },
                              /*
                               * O rótulo da corda deve refletir exatamente a nota de afinação
                               * correspondente a este índice. Como ordenamos as linhas de
                               * forma decrescente (da corda mais aguda para a mais grave),
                               * basta usar tuningNotes[idx] aqui para manter a correspondência
                               * correta entre a linha e sua afinação. Anteriormente, usávamos
                               * numStrings-1-idx, o que invertia erroneamente os rótulos.  */
                              tuningNotes[idx],
                            ),
                            ...row.map(([noteNameDisplay, inScale], fretIndex) => {
                              // Pula cabeçalho 0, portanto fretIndex 0 corresponde à coluna 1
                              // Determine as classes
                              const noteSemitone = parseNoteToSemitone(noteNameDisplay);
                              const isRoot = noteSemitone === result.rootSemitone;
                              let circleClass = 'note-other';
                              if (isRoot) circleClass = 'note-root';
                              else if (inScale) circleClass = 'note-scale';
                              return React.createElement(
                                'td',
                                { key: `cell-${idx}-${fretIndex}`, className: 'cell' },
                                [
                                  React.createElement(
                                    'div',
                                    { key: 'circle', className: `note-circle ${circleClass}` },
                                    noteNameDisplay,
                                  ),
                                ],
                              );
                            }),
                          ],
                        ),
                      ),
                  ),
                ],
              ),
            ],
          )
        : null,
    ],
  );
}

// Renderiza o aplicativo no elemento raiz
ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));