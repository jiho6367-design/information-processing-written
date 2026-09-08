import {
  SUBJECTS,
  type ChoiceNumber,
  type ExamMeta,
  type LoadedExam,
  type Question,
  type QuizAnswer,
  type QuizChoice,
  type QuizConfig,
  type QuizResult,
  type QuizSession,
  type RuntimeQuestion,
  type ScopeStat,
  type SubjectNumber,
  type SubjectStat,
  type WrongAnswerNote,
} from '../types/quiz';

export interface QuestionPoolItem {
  examId: string;
  exam: ExamMeta;
  question: Question;
}

const CHOICE_NUMBERS: ChoiceNumber[] = [1, 2, 3, 4];

export function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSubjectName(subjectNumber: SubjectNumber): string {
  return SUBJECTS.find((subject) => subject.number === subjectNumber)?.name ?? `${subjectNumber}과목`;
}

export function getSubjectLabel(subjectNumber?: SubjectNumber): string {
  return subjectNumber ? `${subjectNumber}과목 ${getSubjectName(subjectNumber)}` : '전체 과목';
}

export function getSubjectSummary(subjectNumbers: SubjectNumber[], verbose = false): string {
  const uniqueSubjects = SUBJECTS.filter((subject) => subjectNumbers.includes(subject.number));

  if (uniqueSubjects.length === 0) {
    return '선택 없음';
  }

  if (uniqueSubjects.length === SUBJECTS.length) {
    return '전체 과목';
  }

  if (verbose) {
    return uniqueSubjects.map((subject) => subject.name).join(', ');
  }

  return uniqueSubjects.length === 1
    ? uniqueSubjects[0].name
    : `${uniqueSubjects[0].name} 외 ${uniqueSubjects.length - 1}과목`;
}

export function getYearSummary(years: number[]): string {
  const sortedYears = [...new Set(years)].sort((a, b) => a - b);

  if (sortedYears.length === 0) {
    return '선택 없음';
  }

  const isContinuous = sortedYears.every(
    (year, index) => index === 0 || year === sortedYears[index - 1] + 1,
  );

  if (sortedYears.length >= 2 && isContinuous) {
    return `${sortedYears[0]}~${sortedYears[sortedYears.length - 1]}년`;
  }

  return sortedYears.map((year) => `${year}년`).join(', ');
}

export function getExamLabel(exam: LoadedExam | ExamMeta): string {
  const meta = 'exam' in exam ? exam.exam : exam;
  return `${meta.year}년 ${meta.session}회`;
}

export function formatRate(value: number): string {
  return `${Math.round(value)}%`;
}

export function shuffleArray<T>(items: T[]): T[] {
  const copied = [...items];

  for (let index = copied.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [copied[index], copied[targetIndex]] = [copied[targetIndex], copied[index]];
  }

  return copied;
}

export function createRuntimeChoices(question: Question, shouldShuffle: boolean): QuizChoice[] {
  const baseChoices = question.choices.map((text, index) => ({
    originalNumber: CHOICE_NUMBERS[index],
    text,
    image: question.choiceImages?.[index] ?? null,
    table: question.choiceTables?.[index] ?? null,
  }));
  const orderedChoices = shouldShuffle ? shuffleArray(baseChoices) : baseChoices;

  return orderedChoices.map((choice, index) => ({
    ...choice,
    displayNumber: CHOICE_NUMBERS[index],
  }));
}

export function toBaseQuestion(question: RuntimeQuestion): Question {
  return {
    id: question.id,
    number: question.number,
    subjectNumber: question.subjectNumber,
    subject: question.subject,
    question: question.question,
    code: question.code,
    table: question.table,
    tables: question.tables,
    tableSeparator: question.tableSeparator,
    choices: question.choices,
    choiceImages: question.choiceImages,
    choiceTables: question.choiceTables,
    answer: question.answer,
    answerNote: question.answerNote,
    explanation: question.explanation,
    image: question.image,
    needsReview: question.needsReview,
  };
}

export function findExam(exams: LoadedExam[], examId: string): LoadedExam | undefined {
  return exams.find((exam) => exam.id === examId);
}

export function getAvailableYears(exams: LoadedExam[]): number[] {
  return [...new Set(exams.map((exam) => exam.exam.year))].sort((a, b) => b - a);
}

export function getSessionsForYear(exams: LoadedExam[], year: number): number[] {
  return exams
    .filter((exam) => exam.exam.year === year)
    .map((exam) => exam.exam.session)
    .sort((a, b) => b - a);
}

export function getExamByYearSession(
  exams: LoadedExam[],
  year: number,
  session: number,
): LoadedExam | undefined {
  return exams.find((exam) => exam.exam.year === year && exam.exam.session === session);
}

export function getExamIdsForYears(exams: LoadedExam[], years: number[]): string[] {
  const yearSet = new Set(years);
  return exams.filter((exam) => yearSet.has(exam.exam.year)).map((exam) => exam.id);
}

export function getConfigExamIds(config: QuizConfig): string[] {
  if (config.examIds?.length) {
    return [...new Set(config.examIds)];
  }

  return config.examId && config.examId !== 'wrong-note' ? [config.examId] : [];
}

export function getConfigSubjectNumbers(config: QuizConfig): SubjectNumber[] {
  if (config.subjectNumbers?.length) {
    return [...new Set(config.subjectNumbers)];
  }

  return config.subjectNumber ? [config.subjectNumber] : SUBJECTS.map((subject) => subject.number);
}

export function normalizeQuizConfig(config: QuizConfig): QuizConfig {
  const examIds = getConfigExamIds(config);
  const subjectNumbers = getConfigSubjectNumbers(config);

  return {
    ...config,
    examIds: config.source !== 'wrong-note' ? examIds : config.examIds,
    subjectNumbers: config.source !== 'wrong-note' ? subjectNumbers : config.subjectNumbers,
  };
}

export function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase('ko-KR');
}

export function questionMatchesSearch(question: Question, keyword: string): boolean {
  const normalizedKeyword = normalizeSearch(keyword);

  if (!normalizedKeyword) {
    return true;
  }

  const text = [
    question.question,
    question.subject,
    question.explanation ?? '',
    ...question.choices,
    ...(question.choiceTables ?? []).flatMap((table) =>
      table ? [table.title ?? '', ...table.headers, ...table.rows.flat()] : [],
    ),
  ]
    .join(' ')
    .toLocaleLowerCase('ko-KR');

  return text.includes(normalizedKeyword);
}

export function getFilteredExamQuestions(
  exams: LoadedExam[],
  examIds: string[],
  subjectNumbers: SubjectNumber[],
): QuestionPoolItem[] {
  const examIdSet = new Set(examIds);
  const subjectSet = new Set(subjectNumbers);
  const seenQuestionIds = new Set<string>();

  return exams.flatMap((exam) => {
    if (!examIdSet.has(exam.id)) {
      return [];
    }

    return exam.questions.flatMap((question) => {
      if (!subjectSet.has(question.subjectNumber) || seenQuestionIds.has(question.id)) {
        return [];
      }

      seenQuestionIds.add(question.id);
      return [{ examId: exam.id, exam: exam.exam, question }];
    });
  });
}

function getQuestionPool(
  config: QuizConfig,
  exams: LoadedExam[],
  wrongAnswerNotes: WrongAnswerNote[],
): QuestionPoolItem[] {
  if (config.source === 'wrong-note') {
    const currentQuestionsById = new Map<string, QuestionPoolItem>();

    exams.forEach((exam) => {
      exam.questions.forEach((question) => {
        currentQuestionsById.set(question.id, {
          examId: exam.id,
          exam: exam.exam,
          question,
        });
      });
    });

    return wrongAnswerNotes.map((note) => currentQuestionsById.get(note.questionId) ?? ({
      examId: note.examId,
      exam: note.exam,
      question: note.question,
    }));
  }

  if (config.source === 'saved-wrong-set') {
    const seenQuestionIds = new Set<string>();
    return exams.flatMap((exam) => exam.questions.flatMap((question) => {
      if (seenQuestionIds.has(question.id)) return [];
      seenQuestionIds.add(question.id);
      return [{ examId: exam.id, exam: exam.exam, question }];
    }));
  }

  return getFilteredExamQuestions(
    exams,
    getConfigExamIds(config),
    getConfigSubjectNumbers(config),
  );
}

export function createQuizSession(
  config: QuizConfig,
  exams: LoadedExam[],
  wrongAnswerNotes: WrongAnswerNote[],
): QuizSession | null {
  const questionIdSet = config.questionIds?.length ? new Set(config.questionIds) : null;
  let pool = getQuestionPool(config, exams, wrongAnswerNotes);

  if (questionIdSet) {
    pool = pool.filter((item) => questionIdSet.has(item.question.id));
  }

  if (config.shuffleQuestions) {
    pool = shuffleArray(pool);
  } else if (config.questionOrder === 'original' && config.questionIds?.length) {
    const orderById = new Map(config.questionIds.map((id, index) => [id, index]));
    pool = [...pool].sort(
      (a, b) => (orderById.get(a.question.id) ?? Number.MAX_SAFE_INTEGER) -
        (orderById.get(b.question.id) ?? Number.MAX_SAFE_INTEGER),
    );
  } else {
    pool = [...pool].sort((a, b) => {
      if (b.exam.year !== a.exam.year) return b.exam.year - a.exam.year;
      if (b.exam.session !== a.exam.session) return b.exam.session - a.exam.session;
      if (a.question.subjectNumber !== b.question.subjectNumber) {
        return a.question.subjectNumber - b.question.subjectNumber;
      }
      return a.question.number - b.question.number;
    });
  }

  const limit = config.count === 'all' ? pool.length : Math.min(config.count, pool.length);
  const selectedQuestions = pool.slice(0, limit);

  if (selectedQuestions.length === 0) {
    return null;
  }

  return {
    id: createId('quiz'),
    config,
    questions: selectedQuestions.map(({ examId, exam, question }) => ({
      ...question,
      examId,
      exam,
      runtimeChoices: createRuntimeChoices(question, config.shuffleChoices),
    })),
    currentIndex: 0,
    answers: {},
    startedAt: new Date().toISOString(),
  };
}

/**
 * Restores a saved in-progress session with the latest question content while
 * preserving its question order, displayed choice order, current position, and
 * selected answers. This lets PDF-data repairs appear after a page refresh.
 */
export function refreshQuizSessionQuestions(session: QuizSession, exams: LoadedExam[]): QuizSession {
  const currentQuestionsById = new Map<string, QuestionPoolItem>();

  exams.forEach((exam) => {
    exam.questions.forEach((question) => {
      currentQuestionsById.set(question.id, {
        examId: exam.id,
        exam: exam.exam,
        question,
      });
    });
  });

  const refreshedQuestions = session.questions.map((savedQuestion) => {
    const currentQuestion = currentQuestionsById.get(savedQuestion.id);
    if (!currentQuestion) {
      return savedQuestion;
    }

    return {
      ...currentQuestion.question,
      examId: currentQuestion.examId,
      exam: currentQuestion.exam,
      runtimeChoices: savedQuestion.runtimeChoices.map((savedChoice) => {
        const choiceIndex = savedChoice.originalNumber - 1;

        return {
          ...savedChoice,
          text: currentQuestion.question.choices[choiceIndex] ?? savedChoice.text,
          image: currentQuestion.question.choiceImages?.[choiceIndex] ?? null,
          table: currentQuestion.question.choiceTables?.[choiceIndex] ?? null,
        };
      }),
    };
  });

  const refreshedAnswers = Object.fromEntries(
    Object.entries(session.answers).map(([questionId, answer]) => {
      const refreshedQuestion = refreshedQuestions.find((question) => question.id === questionId);

      return [
        questionId,
        refreshedQuestion
          ? { ...answer, isCorrect: answer.selectedChoice === refreshedQuestion.answer }
          : answer,
      ];
    }),
  ) as Record<string, QuizAnswer>;

  return {
    ...session,
    questions: refreshedQuestions,
    answers: refreshedAnswers,
  };
}

export function isSameQuizConfig(left: QuizConfig, right: QuizConfig): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function calculateSubjectStats(
  questions: RuntimeQuestion[],
  answers: Record<string, QuizAnswer>,
): SubjectStat[] {
  return SUBJECTS.map((subject) => {
    const subjectQuestions = questions.filter((question) => question.subjectNumber === subject.number);
    const correct = subjectQuestions.filter((question) => answers[question.id]?.isCorrect).length;
    const wrong = subjectQuestions.filter((question) => {
      const answer = answers[question.id];
      return answer ? !answer.isCorrect : false;
    }).length;
    const total = subjectQuestions.length;

    return {
      subjectNumber: subject.number,
      subject: subject.name,
      total,
      correct,
      wrong,
      correctRate: total === 0 ? 0 : (correct / total) * 100,
    };
  }).filter((stat) => stat.total > 0);
}

function calculateScopeStats(
  questions: RuntimeQuestion[],
  answers: Record<string, QuizAnswer>,
  getKey: (question: RuntimeQuestion) => string,
  getLabel: (question: RuntimeQuestion) => string,
): ScopeStat[] {
  const groups = new Map<string, { label: string; questions: RuntimeQuestion[] }>();

  questions.forEach((question) => {
    const key = getKey(question);
    const existing = groups.get(key);
    if (existing) {
      existing.questions.push(question);
    } else {
      groups.set(key, { label: getLabel(question), questions: [question] });
    }
  });

  return [...groups.entries()].map(([key, group]) => {
    const correct = group.questions.filter((question) => answers[question.id]?.isCorrect).length;
    const wrong = group.questions.filter((question) => {
      const answer = answers[question.id];
      return answer ? !answer.isCorrect : false;
    }).length;
    const total = group.questions.length;
    return {
      key,
      label: group.label,
      total,
      correct,
      wrong,
      correctRate: total === 0 ? 0 : (correct / total) * 100,
    };
  });
}

export function calculateQuizResult(session: QuizSession): QuizResult {
  const answers = Object.values(session.answers);
  const correct = answers.filter((answer) => answer.isCorrect).length;
  const wrong = answers.filter((answer) => !answer.isCorrect).length;
  const unanswered = session.questions.length - answers.length;
  const wrongQuestions = session.questions
    .filter((question) => !session.answers[question.id]?.isCorrect)
    .map((question) => ({
      question,
      answer: session.answers[question.id],
    }));
  const questionIds = session.questions.map((question) => question.id);
  const correctQuestionIds = session.questions
    .filter((question) => session.answers[question.id]?.isCorrect)
    .map((question) => question.id);
  const correctQuestionIdSet = new Set(correctQuestionIds);
  const wrongQuestionIds = questionIds.filter((questionId) => !correctQuestionIdSet.has(questionId));

  return {
    sessionId: session.id,
    config: session.config,
    exam: session.questions[0].exam,
    startedAt: session.startedAt,
    completedAt: new Date().toISOString(),
    total: session.questions.length,
    correct,
    wrong,
    unanswered,
    correctRate: session.questions.length === 0 ? 0 : (correct / session.questions.length) * 100,
    subjectStats: calculateSubjectStats(session.questions, session.answers),
    yearStats: calculateScopeStats(
      session.questions,
      session.answers,
      (question) => String(question.exam.year),
      (question) => `${question.exam.year}년`,
    ).sort((a, b) => Number(b.key) - Number(a.key)),
    examStats: calculateScopeStats(
      session.questions,
      session.answers,
      (question) => question.examId,
      (question) => `${question.exam.year}년 ${question.exam.session}회`,
    ).sort((a, b) => b.key.localeCompare(a.key)),
    wrongQuestions,
    questionIds,
    correctQuestionIds,
    wrongQuestionIds,
  };
}

export function getLowestSubjectStat(stats: SubjectStat[]): SubjectStat | null {
  if (stats.length === 0) {
    return null;
  }

  return [...stats].sort((a, b) => a.correctRate - b.correctRate)[0];
}

export function filterQuestions(
  questions: Question[],
  subjectNumber: SubjectNumber | undefined,
  keyword: string,
): Question[] {
  return questions.filter((question) => {
    const matchesSubject = subjectNumber ? question.subjectNumber === subjectNumber : true;
    return matchesSubject && questionMatchesSearch(question, keyword);
  });
}
