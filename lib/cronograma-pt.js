/**
 * Auto Brazilian Portuguese for cronograma titles/venues.
 * Used on every content save so PT stays in sync with Spanish.
 */
'use strict';

const TITULO_EXACT = {
  'llegada - Acreditación y bienvenida': 'chegada - Credenciamento e boas-vindas',
  'Desayuno': 'Café da manhã',
  'Acondicionamiento y organización de los espacios de hospedaje.': 'Acondicionamento e organização dos espaços de hospedagem.',
  'Clases parciales  instrumentales (ORQUESTA FINC)': 'Aulas parciais instrumentais (ORQUESTRA FINC)',
  'Ensayo general (Orquesta Fronterita)': 'Ensaio geral (Orquestra Fronterita)',
  'MASTER CLASS': 'MASTER CLASS',
  'Almuerzo': 'Almoço',
  'CONCIERTOS AL MEDIODIA': 'CONCERTOS AO MEIO-DIA',
  'Ensayo general (ORQUESTA FINC )': 'Ensaio geral (ORQUESTRA FINC)',
  'Aulas de Instrumentos (Fronterita)': 'Salas de instrumentos (Fronterita)',
  'Merienda y descanso': 'Lanche e descanso',
  'Presentación de las delegaciones-Profesores-Actuación': 'Apresentação das delegações-Professores-Apresentação',
  'Cena - Descanso': 'Jantar - Descanso',
  'DESAYUNO': 'CAFÉ DA MANHÃ',
  'PRÁCTICA INDIVIDUAL': 'PRÁTICA INDIVIDUAL',
  'ORQUESTA FINC': 'ORQUESTRA FINC',
  'FRONTRITA': 'FRONTERITA',
  'ALMUERZO': 'ALMOÇO',
  'FRONTERITA': 'FRONTERITA',
  'MERIENDA': 'LANCHE',
  'CONCIERTO': 'CONCERTO',
  'CENA - DESCANSO': 'JANTAR - DESCANSO',
  'Taller de dirección coral': 'Oficina de regência coral',
  'Ensayo conjunto': 'Ensaio conjunto',
  'Gala sinfónica': 'Gala sinfônica',
  'Matiné familiar': 'Matinê familiar',
  'Concierto de clausura': 'Concerto de encerramento',
  'Brindis y cierre': 'Brinde e encerramento',
};

const SEDE_EXACT = {
  'Escuela de Frontera 604': 'Escola de Fronteira 604',
  'ESCUELAS: EPET 26 - ESPECIAL - FRONTERA 604 - E.F.A 0706': 'ESCOLAS: EPET 26 - ESPECIAL - FRONTEIRA 604 - E.F.A 0706',
  'Aulas': 'Salas',
  'Comedor': 'Refeitório',
  'Altos de Irigoyen Hotel': 'Altos de Irigoyen Hotel',
  'Sala mayor': 'Sala principal',
  'aseo personal': 'higiene pessoal',
  'Parciales de intrumentos': 'Parciais de instrumentos',
  'Ensayo general': 'Ensaio geral',
  'Alumnos inscriptos': 'Alunos inscritos',
  'ensayo genera -Sala mayor': 'ensaio geral - Sala principal',
  'Aulas de instrumentos': 'Salas de instrumentos',
  'aseo personal -Preparación para concierto': 'higiene pessoal - Preparação para o concerto',
  'Escola de Educação Básica Dr. Theodureto': 'Escola de Educação Básica Dr. Theodureto',
  'Luego cada delagación a sus hospedajes': 'Depois cada delegação para suas hospedagens',
  'Parque Temático y Ambiental de la Integración': 'Parque Temático e Ambiental da Integração',
};

const TITULO_REPS = [
  ['ORQUESTA', 'ORQUESTRA'],
  ['Orquesta', 'Orquestra'],
  ['Ensayo general', 'Ensaio geral'],
  ['ensayo general', 'ensaio geral'],
  ['Ensayo', 'Ensaio'],
  ['ensayo', 'ensaio'],
  ['Clases parciales', 'Aulas parciais'],
  ['Acreditación', 'Credenciamento'],
  ['bienvenida', 'boas-vindas'],
  ['llegada', 'chegada'],
  ['Desayuno', 'Café da manhã'],
  ['DESAYUNO', 'CAFÉ DA MANHÃ'],
  ['Almuerzo', 'Almoço'],
  ['ALMUERZO', 'ALMOÇO'],
  ['Merienda', 'Lanche'],
  ['MERIENDA', 'LANCHE'],
  ['Cena', 'Jantar'],
  ['CENA', 'JANTAR'],
  ['Concierto', 'Concerto'],
  ['CONCIERTO', 'CONCERTO'],
  ['CONCIERTOS', 'CONCERTOS'],
  ['Presentación', 'Apresentação'],
  ['delegaciones', 'delegações'],
  ['Profesores', 'Professores'],
  ['Actuación', 'Apresentação'],
  ['dirección coral', 'regência coral'],
  ['Taller', 'Oficina'],
  ['clausura', 'encerramento'],
  ['Brindis', 'Brinde'],
  ['cierre', 'encerramento'],
  ['sinfónica', 'sinfônica'],
  ['Matiné', 'Matinê'],
  ['PRÁCTICA', 'PRÁTICA'],
  ['AL MEDIODIA', 'AO MEIO-DIA'],
  ['Aulas de Instrumentos', 'Salas de instrumentos'],
  ['Aulas de instrumentos', 'Salas de instrumentos'],
  ['instrumentales', 'instrumentais'],
  ['parciales', 'parciais'],
  ['organización', 'organização'],
  ['espacios', 'espaços'],
  ['hospedaje', 'hospedagem'],
  ['Acondicionamiento', 'Acondicionamento'],
  ['Descanso', 'Descanso'],
  ['DESCANSO', 'DESCANSO'],
  ['FRONTRITA', 'FRONTERITA'],
];

const SEDE_REPS = [
  ['Escuela de Frontera', 'Escola de Fronteira'],
  ['ESCUELAS', 'ESCOLAS'],
  ['FRONTERA', 'FRONTEIRA'],
  ['Aulas', 'Salas'],
  ['Comedor', 'Refeitório'],
  ['Sala mayor', 'Sala principal'],
  ['aseo personal', 'higiene pessoal'],
  ['Preparación para concierto', 'Preparação para o concerto'],
  ['Parque Temático y Ambiental de la Integración', 'Parque Temático e Ambiental da Integração'],
  ['Ensayo general', 'Ensaio geral'],
  ['ensayo genera', 'ensaio geral'],
  ['Parciales de intrumentos', 'Parciais de instrumentos'],
  ['Alumnos inscriptos', 'Alunos inscritos'],
  ['Luego cada delagación a sus hospedajes', 'Depois cada delegação para suas hospedagens'],
  ['Instrumentos', 'instrumentos'],
];

function applyReps(text, reps) {
  let t = text;
  for (const [a, b] of reps) t = t.split(a).join(b);
  return t;
}

function translateTitulo(s) {
  const raw = String(s || '');
  if (raw.includes('\n')) {
    return raw.split('\n').map((line) => translateTitulo(line)).join('\n');
  }
  s = raw.trim();
  if (!s) return '';
  if (TITULO_EXACT[s]) return TITULO_EXACT[s];
  return applyReps(s, TITULO_REPS);
}

function translateSede(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (SEDE_EXACT[s]) return SEDE_EXACT[s];
  return applyReps(s, SEDE_REPS);
}

function enrichItem(item) {
  if (!item || typeof item !== 'object') return item;
  const titulo = item.titulo || item.texto || '';
  const sede = item.sede || '';
  item.tituloPt = translateTitulo(titulo);
  item.sedePt = sede ? translateSede(sede) : '';
  return item;
}

function enrichCronograma(cronograma) {
  if (!cronograma || typeof cronograma !== 'object') return cronograma;
  for (const day of Object.keys(cronograma)) {
    const events = cronograma[day];
    if (!Array.isArray(events)) continue;
    for (const ev of events) {
      enrichItem(ev);
      if (Array.isArray(ev.celdas)) {
        ev.celdas = ev.celdas.map((c) => {
          if (typeof c === 'string') {
            return enrichItem({ hora: '', sede: '', titulo: c });
          }
          return enrichItem(c);
        });
      }
    }
  }
  return cronograma;
}

function enrichContent(content) {
  if (!content || typeof content !== 'object') return content;
  if (content.cronograma) enrichCronograma(content.cronograma);
  return content;
}

module.exports = {
  translateTitulo,
  translateSede,
  enrichCronograma,
  enrichContent,
};
