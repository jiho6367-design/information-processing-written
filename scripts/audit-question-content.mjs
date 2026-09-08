import fs from 'node:fs';
import path from 'node:path';

const examsDir = path.resolve('src/data/exams');
const files = fs
  .readdirSync(examsDir)
  .filter((file) => file.endsWith('.json'))
  .sort();

const CODE_PATTERNS = [
  /#include\b/i,
  /\bint\s+main\b/i,
  /\bvoid\s+main\b/i,
  /\bprintf\s*\(/i,
  /\bscanf\s*\(/i,
  /\bstruct\b/i,
  /\bchar\s+\w+/i,
  /\bfor\s*\(/i,
  /\bwhile\s*\(/i,
  /\bif\s*\(/i,
  /\belse\b/i,
  /\bpublic\s+static\s+void\s+main\b/i,
  /\bSystem\.out\./,
  /\bclass\s+\w+/,
  /\bdef\s+\w+\s*\(/,
  /\bprint\s*\(/,
  /\bSELECT\b/i,
  /\bINSERT\b/i,
  /\bUPDATE\b/i,
  /\bDELETE\b/i,
  /\bCREATE\b/i,
  /\bDROP\b/i,
  /\bALTER\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bchmod\b/i,
  /\buname\b/i,
  /\bfork\s*\(/i,
  /\bdo\s*\{/i,
  /\bend\b/i,
  /=>/,
  />>>/,
];

const TABLE_WORDS = [
  '테이블',
  '릴레이션',
  '학생',
  '성적',
  '회원',
  '사원',
  '세그먼트',
  '페이지',
  '프로세스',
  '작업',
  '도착',
  '실행',
  '학번',
  '이름',
  '주소',
  '점수',
  '아이디',
  '성명',
  '등급',
  '적립금',
];

const IMAGE_WORDS = [
  '다이어그램',
  '그래프',
  '트리',
  'UML',
  'DFD',
  'ER',
  '순서도',
  '회로',
  '그림',
  '도식',
  '구조도',
];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function tableShapeErrors(question) {
  const tables = [...(question.table ? [question.table] : []), ...asArray(question.tables)];
  return tables.flatMap((table, tableIndex) => {
    const headers = asArray(table?.headers);
    const rows = asArray(table?.rows);
    const errors = [];

    if (headers.length === 0 || rows.length === 0) {
      errors.push(`empty table ${tableIndex + 1}`);
    }

    rows.forEach((row, rowIndex) => {
      if (!Array.isArray(row) || row.length !== headers.length) {
        errors.push(`table ${tableIndex + 1} row ${rowIndex + 1} has ${Array.isArray(row) ? row.length : 0}/${headers.length} cells`);
      }
    });

    return errors;
  });
}

function hasCodeMarker(text) {
  return CODE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasTableLikeLines(text) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const denseRows = lines.filter((line) => line.split(/\s+/).length >= 4);
  const hasTableWord = TABLE_WORDS.some((word) => text.includes(word));
  return hasTableWord && denseRows.length >= 2;
}

function hasImageCue(text) {
  return IMAGE_WORDS.some((word) => text.includes(word));
}

const result = {
  summary: {
    files: files.length,
    exams: [],
    totalQuestions: 0,
  },
  codeFormattingCandidates: [],
  tableFormattingCandidates: [],
  imageReviewCandidates: [],
  malformedTextCandidates: [],
  tableShapeErrors: [],
  dataIntegrityErrors: [],
  needsReviewQuestions: [],
};

for (const file of files) {
  const fullPath = path.join(examsDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  const questions = asArray(data.questions);
  const seenIds = new Set();
  const seenNumbers = new Set();
  const examId = file.replace(/\.json$/, '');

  result.summary.exams.push({
    examId,
    title: data.exam?.title ?? '',
    questions: questions.length,
  });
  result.summary.totalQuestions += questions.length;

  if (questions.length !== 100) {
    result.dataIntegrityErrors.push({ examId, reason: `expected 100 questions, found ${questions.length}` });
  }

  for (const question of questions) {
    const ref = `${examId}-${String(question.number).padStart(3, '0')}`;
    const questionText = String(question.question ?? '');
    const codeText = String(question.code ?? '');
    const allText = [questionText, codeText, ...asArray(question.choices).map(String)].join('\n');

    if (seenIds.has(question.id)) {
      result.dataIntegrityErrors.push({ examId, id: question.id, reason: 'duplicate question id' });
    }
    seenIds.add(question.id);
    seenNumbers.add(question.number);

    if (question.id !== ref) {
      result.dataIntegrityErrors.push({ examId, id: question.id, reason: `id does not match ${ref}` });
    }
    if (!Array.isArray(question.choices) || question.choices.length !== 4) {
      result.dataIntegrityErrors.push({ examId, id: question.id, reason: 'choices length is not 4' });
    }
    if (![1, 2, 3, 4].includes(question.answer)) {
      result.dataIntegrityErrors.push({ examId, id: question.id, reason: 'answer is not 1-4' });
    }

    const tableErrors = tableShapeErrors(question);
    for (const error of tableErrors) {
      result.tableShapeErrors.push({ examId, id: question.id, number: question.number, reason: error });
    }

    if (!question.code && hasCodeMarker(questionText)) {
      result.codeFormattingCandidates.push({ examId, id: question.id, number: question.number, reason: 'code marker in question text without code field' });
    }
    if (question.code === '') {
      result.codeFormattingCandidates.push({ examId, id: question.id, number: question.number, reason: 'empty code field' });
    }

    if (!question.table && !question.tables && hasTableLikeLines(questionText)) {
      result.tableFormattingCandidates.push({ examId, id: question.id, number: question.number, reason: 'table-like text in question field' });
    }

    if (!question.image && hasImageCue(questionText)) {
      result.imageReviewCandidates.push({ examId, id: question.id, number: question.number, reason: 'image cue without image field' });
    }

    if (/\\n/.test(allText)) {
      result.malformedTextCandidates.push({ examId, id: question.id, number: question.number, reason: 'literal \\n found' });
    }
    if (/<\/?[a-z][\s\S]*>/i.test(allText)) {
      result.malformedTextCandidates.push({ examId, id: question.id, number: question.number, reason: 'HTML tag-like text found' });
    }
    if (question.needsReview) {
      result.needsReviewQuestions.push({ examId, id: question.id, number: question.number, reason: 'needsReview true' });
    }
  }

  for (let number = 1; number <= 100; number += 1) {
    if (!seenNumbers.has(number)) {
      result.dataIntegrityErrors.push({ examId, reason: `missing question number ${number}` });
    }
  }
}

console.log(JSON.stringify(result, null, 2));
