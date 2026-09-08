import type {
  ChoiceNumber,
  LoadedExam,
  QuestionCountOption,
  QuizFilterState,
  QuizResult,
  QuizSession,
  RuntimeQuestion,
  SavedWrongSet,
  SavedWrongSetProgress,
  SavedWrongSetsStore,
  StudyRecord,
  SubjectNumber,
  WrongAnswerNote,
} from '../types/quiz';
import { SUBJECTS } from '../types/quiz';
import {
  createId,
  getAvailableYears,
  getExamIdsForYears,
  getSubjectSummary,
  getYearSummary,
  normalizeQuizConfig,
  toBaseQuestion,
} from './quizUtils';

const CURRENT_SESSION_KEY = 'info-processing-quiz:current-session';
const WRONG_ANSWERS_KEY = 'info-processing-quiz:wrong-answers';
const STUDY_RECORDS_KEY = 'info-processing-quiz:study-records';
const LAST_RESULT_KEY = 'info-processing-quiz:last-result';
const FILTER_STATE_KEY = 'info-processing-quiz:filter-state';
const SAVED_WRONG_SETS_KEY = 'info-processing-quiz:saved-wrong-sets';

const QUESTION_COUNTS: QuestionCountOption[] = [10, 20, 40, 60, 100, 'all'];
const warnedSavedWrongSetIssues = new Set<string>();

function warnSavedWrongSetOnce(key: string, message: string, details?: unknown): void {
  if (warnedSavedWrongSetIssues.has(key)) return;
  warnedSavedWrongSetIssues.add(key);
  console.warn(message, details);
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? (JSON.parse(rawValue) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson<T>(key: string, value: T): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadCurrentSession(): QuizSession | null {
  const session = loadJson<QuizSession | null>(CURRENT_SESSION_KEY, null);
  return session ? { ...session, config: normalizeQuizConfig(session.config) } : null;
}

export function saveCurrentSession(session: QuizSession): void {
  saveJson(CURRENT_SESSION_KEY, session);
}

export function clearCurrentSession(): void {
  if (canUseStorage()) {
    window.localStorage.removeItem(CURRENT_SESSION_KEY);
  }
}

export function loadWrongAnswerNotes(): WrongAnswerNote[] {
  return loadJson<WrongAnswerNote[]>(WRONG_ANSWERS_KEY, []);
}

function saveWrongAnswerNotes(notes: WrongAnswerNote[]): void {
  saveJson(
    WRONG_ANSWERS_KEY,
    [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export function upsertWrongAnswerNote(
  question: RuntimeQuestion,
  selectedChoice: ChoiceNumber,
): void {
  const now = new Date().toISOString();
  const notes = loadWrongAnswerNotes();
  const existingIndex = notes.findIndex((note) => note.questionId === question.id);

  if (existingIndex >= 0) {
    const existing = notes[existingIndex];
    notes[existingIndex] = {
      ...existing,
      examId: question.examId,
      exam: question.exam,
      question: toBaseQuestion(question),
      selectedChoice,
      updatedAt: now,
      wrongCount: existing.wrongCount + 1,
      attempts: existing.attempts + 1,
    };
  } else {
    notes.push({
      questionId: question.id,
      examId: question.examId,
      exam: question.exam,
      question: toBaseQuestion(question),
      selectedChoice,
      addedAt: now,
      updatedAt: now,
      wrongCount: 1,
      correctCount: 0,
      attempts: 1,
    });
  }

  saveWrongAnswerNotes(notes);
}

export function recordCorrectWrongAnswerAttempt(questionId: string): void {
  const notes = loadWrongAnswerNotes();
  const existingIndex = notes.findIndex((note) => note.questionId === questionId);

  if (existingIndex < 0) {
    return;
  }

  const now = new Date().toISOString();
  const existing = notes[existingIndex];
  notes[existingIndex] = {
    ...existing,
    updatedAt: now,
    correctCount: existing.correctCount + 1,
    attempts: existing.attempts + 1,
  };
  saveWrongAnswerNotes(notes);
}

export function removeWrongAnswerNote(questionId: string): void {
  saveWrongAnswerNotes(loadWrongAnswerNotes().filter((note) => note.questionId !== questionId));
}

export function clearWrongAnswerNotes(): void {
  saveWrongAnswerNotes([]);
}

export function loadStudyRecords(): StudyRecord[] {
  return loadJson<StudyRecord[]>(STUDY_RECORDS_KEY, []);
}

export function saveStudyRecord(result: QuizResult): StudyRecord {
  const years = result.config.years?.length
    ? result.config.years
    : (result.yearStats ?? []).map((stat) => Number(stat.key));
  const subjectNumbers = result.config.subjectNumbers?.length
    ? result.config.subjectNumbers
    : result.subjectStats.map((stat) => stat.subjectNumber);
  const examIds = result.config.examIds?.length
    ? result.config.examIds
    : result.config.examId !== 'wrong-note'
      ? [result.config.examId]
      : [];
  const record: StudyRecord = {
    id: createId('record'),
    completedAt: result.completedAt,
    examTitle: years.length > 1 ? `${getYearSummary(years)} 기출문제` : result.exam.title,
    year: result.exam.year,
    session: result.exam.session,
    subjectLabel: getSubjectSummary(subjectNumbers),
    years,
    examIds,
    subjectNumbers,
    source: result.config.source,
    total: result.total,
    correct: result.correct,
    wrong: result.wrong,
    correctRate: result.correctRate,
    attemptId: result.sessionId,
    questionIds: result.questionIds ?? [],
    correctQuestionIds: result.correctQuestionIds ?? [],
    wrongQuestionIds: result.wrongQuestionIds ?? result.wrongQuestions.map(({ question }) => question.id),
    sourceType: result.config.source,
    savedWrongSetId: result.config.savedWrongSetId,
    savedWrongSetTitle: result.config.savedWrongSetTitle,
    retryMode: result.config.retryMode,
    remainingCountBefore: result.savedWrongSetProgress?.remainingBefore,
    remainingCountAfter: result.savedWrongSetProgress?.remainingAfter,
  };

  saveJson(STUDY_RECORDS_KEY, [record, ...loadStudyRecords()].slice(0, 50));
  return record;
}

export function clearStudyRecords(): void {
  saveJson(STUDY_RECORDS_KEY, []);
}

export function loadLastResult(): QuizResult | null {
  const result = loadJson<QuizResult | null>(LAST_RESULT_KEY, null);
  return result ? { ...result, config: normalizeQuizConfig(result.config) } : null;
}

export function saveLastResult(result: QuizResult): void {
  saveJson(LAST_RESULT_KEY, result);
}

interface LegacyFilterState extends Partial<QuizFilterState> {
  selectedYear?: number;
  selectedSession?: number;
  selectedSubject?: number;
  selectedExamIds?: string[];
}

export function loadQuizFilterState(exams: LoadedExam[]): QuizFilterState {
  const saved = loadJson<LegacyFilterState | null>(FILTER_STATE_KEY, null);
  const availableYears = getAvailableYears(exams);
  const availableYearSet = new Set(availableYears);
  const availableExamIds = new Set(exams.map((exam) => exam.id));
  const availableSubjects = new Set(SUBJECTS.map((subject) => subject.number));
  const hasSavedState = saved !== null;

  const requestedYears = Array.isArray(saved?.selectedYears)
    ? saved.selectedYears
    : saved?.selectedYear != null
      ? [saved.selectedYear]
      : hasSavedState
        ? []
        : availableYears.slice(0, 1);
  const selectedYears = [...new Set(requestedYears)]
    .filter((year) => availableYearSet.has(year))
    .sort((a, b) => b - a);

  const savedExamIds = Array.isArray(saved?.selectedExamKeys)
    ? saved.selectedExamKeys
    : Array.isArray(saved?.selectedExamIds)
      ? saved.selectedExamIds
      : saved?.selectedYear != null && saved.selectedSession != null
        ? [`${saved.selectedYear}-${saved.selectedSession}`]
        : null;
  const selectedYearSet = new Set(selectedYears);
  const selectedExamKeys = [
    ...new Set(savedExamIds ?? getExamIdsForYears(exams, selectedYears)),
  ].filter((examId) => {
    const exam = exams.find((item) => item.id === examId);
    return availableExamIds.has(examId) && exam != null && selectedYearSet.has(exam.exam.year);
  });

  const requestedSubjects = Array.isArray(saved?.selectedSubjectNumbers)
    ? saved.selectedSubjectNumbers
    : saved?.selectedSubject != null
      ? [saved.selectedSubject]
      : SUBJECTS.map((subject) => subject.number);
  const selectedSubjectNumbers = [...new Set(requestedSubjects)].filter(
    (subject): subject is SubjectNumber => availableSubjects.has(subject as SubjectNumber),
  );
  const count = QUESTION_COUNTS.includes(saved?.count as QuestionCountOption)
    ? (saved?.count as QuestionCountOption)
    : 'all';

  return {
    selectedYears,
    selectedExamKeys,
    selectedSubjectNumbers,
    count,
    shuffleQuestions: saved?.shuffleQuestions ?? false,
    shuffleChoices: saved?.shuffleChoices ?? false,
  };
}

export function saveQuizFilterState(state: QuizFilterState): void {
  saveJson(FILTER_STATE_KEY, state);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && item.length > 0))];
}

function normalizeSavedWrongSet(value: unknown, validQuestionIds?: Set<string>): SavedWrongSet | null {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string') {
    warnSavedWrongSetOnce(`invalid:${String(value)}`, '유효하지 않은 저장 오답 세트를 건너뜁니다.', value);
    return null;
  }

  const title = value.title.trim().slice(0, 80);
  if (!title) {
    warnSavedWrongSetOnce(`empty-title:${value.id}`, '이름이 없는 저장 오답 세트를 건너뜁니다.', value.id);
    return null;
  }

  const originalQuestionIds = uniqueStrings(value.originalQuestionIds);
  const originalIdSet = new Set(originalQuestionIds);
  const savedOrder = uniqueStrings(value.originalQuestionOrder).filter((id) => originalIdSet.has(id));
  const originalQuestionOrder = [
    ...savedOrder,
    ...originalQuestionIds.filter((id) => !savedOrder.includes(id)),
  ];
  const remainingQuestionIds = uniqueStrings(value.remainingQuestionIds).filter((id) => originalIdSet.has(id));
  const remainingIdSet = new Set(remainingQuestionIds);
  const masteredQuestionIds = uniqueStrings(value.masteredQuestionIds).filter(
    (id) => originalIdSet.has(id) && !remainingIdSet.has(id),
  );

  if (validQuestionIds) {
    const missingIds = originalQuestionIds.filter((id) => !validQuestionIds.has(id));
    if (missingIds.length > 0) {
      warnSavedWrongSetOnce(
        `missing:${value.id}:${missingIds.join(',')}`,
        `저장 오답 세트 ${value.id}에서 현재 찾을 수 없는 문제 ${missingIds.length}개`,
        missingIds,
      );
    }
  }

  const now = new Date().toISOString();
  const years = Array.isArray(value.years)
    ? [...new Set(value.years.filter((year): year is number => Number.isInteger(year)))].sort((a, b) => b - a)
    : [];
  const subjects = Array.isArray(value.subjectNumbers)
    ? [...new Set(value.subjectNumbers.filter(
        (subject): subject is SubjectNumber => SUBJECTS.some((item) => item.number === subject),
      ))].sort((a, b) => a - b)
    : [];

  return {
    id: value.id,
    title,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : now,
    sourceAttemptId: typeof value.sourceAttemptId === 'string' ? value.sourceAttemptId : undefined,
    sourceType: value.sourceType === 'exam' || value.sourceType === 'wrong-note' || value.sourceType === 'saved-wrong-set'
      ? value.sourceType
      : undefined,
    years,
    examKeys: uniqueStrings(value.examKeys),
    subjectNumbers: subjects,
    originalQuestionIds,
    originalQuestionOrder,
    remainingQuestionIds,
    masteredQuestionIds,
    originalWrongCount: typeof value.originalWrongCount === 'number' && value.originalWrongCount >= 0
      ? value.originalWrongCount
      : originalQuestionIds.length,
    retryCount: typeof value.retryCount === 'number' && value.retryCount >= 0 ? value.retryCount : 0,
    lastRetriedAt: typeof value.lastRetriedAt === 'string' ? value.lastRetriedAt : undefined,
    completedAt: typeof value.completedAt === 'string' ? value.completedAt : undefined,
    isBookmarked: value.isBookmarked === true,
  };
}

function sortSavedWrongSets(items: SavedWrongSet[]): SavedWrongSet[] {
  return [...items].sort((a, b) => {
    if (a.isBookmarked !== b.isBookmarked) return a.isBookmarked ? -1 : 1;
    const updatedCompare = b.updatedAt.localeCompare(a.updatedAt);
    return updatedCompare !== 0 ? updatedCompare : b.createdAt.localeCompare(a.createdAt);
  });
}

export function loadSavedWrongSets(validQuestionIds?: Set<string>): SavedWrongSet[] {
  const raw = loadJson<unknown>(SAVED_WRONG_SETS_KEY, { version: 1, items: [] });
  const rawItems = isObject(raw) && Array.isArray(raw.items) ? raw.items : [];
  if (!isObject(raw) || raw.version !== 1 || !Array.isArray(raw.items)) {
    warnSavedWrongSetOnce('invalid-store', '저장 오답 세트 데이터를 버전 1 형식으로 정규화합니다.');
  }
  return sortSavedWrongSets(
    rawItems
      .map((item) => normalizeSavedWrongSet(item, validQuestionIds))
      .filter((item): item is SavedWrongSet => item !== null),
  );
}

function saveSavedWrongSets(items: SavedWrongSet[]): void {
  const store: SavedWrongSetsStore = { version: 1, items: sortSavedWrongSets(items) };
  saveJson(SAVED_WRONG_SETS_KEY, store);
}

export function findStudyRecordByAttemptId(attemptId: string): StudyRecord | undefined {
  return loadStudyRecords().find((record) => record.attemptId === attemptId || record.id === attemptId);
}

function linkCreatedSavedWrongSet(record: StudyRecord, savedWrongSetId: string): void {
  const isSavedWrongSetRetry = (record.sourceType ?? record.source) === 'saved-wrong-set';
  saveJson(STUDY_RECORDS_KEY, loadStudyRecords().map((item) => {
    if (item.id !== record.id) return item;
    return {
      ...item,
      createdSavedWrongSetId: savedWrongSetId,
      ...(isSavedWrongSetRetry ? {} : { savedWrongSetId }),
    };
  }));
}

export function createSavedWrongSet(
  record: StudyRecord,
  title: string,
  isBookmarked: boolean,
): { item: SavedWrongSet; created: boolean } | null {
  const wrongQuestionIds = uniqueStrings(record.wrongQuestionIds);
  if (wrongQuestionIds.length === 0) return null;

  const items = loadSavedWrongSets();
  const sourceAttemptId = record.id;
  const existing = items.find((item) => item.sourceAttemptId === sourceAttemptId);
  if (existing) {
    linkCreatedSavedWrongSet(record, existing.id);
    return { item: existing, created: false };
  }

  const cleanTitle = title.trim().slice(0, 80);
  if (!cleanTitle) return null;

  const wrongIdSet = new Set(wrongQuestionIds);
  const orderedWrongIds = uniqueStrings(record.questionIds).filter((id) => wrongIdSet.has(id));
  const originalQuestionOrder = [
    ...orderedWrongIds,
    ...wrongQuestionIds.filter((id) => !orderedWrongIds.includes(id)),
  ];
  const now = new Date().toISOString();
  const item: SavedWrongSet = {
    id: createId('wrong-set'),
    title: cleanTitle,
    createdAt: now,
    updatedAt: now,
    sourceAttemptId,
    sourceType: record.sourceType ?? record.source ?? 'exam',
    years: record.years ?? [record.year],
    examKeys: record.examIds ?? [],
    subjectNumbers: record.subjectNumbers ?? [],
    originalQuestionIds: wrongQuestionIds,
    originalQuestionOrder,
    remainingQuestionIds: [...wrongQuestionIds],
    masteredQuestionIds: [],
    originalWrongCount: wrongQuestionIds.length,
    retryCount: 0,
    isBookmarked,
  };
  saveSavedWrongSets([item, ...items]);
  linkCreatedSavedWrongSet(record, item.id);
  return { item, created: true };
}

export function renameSavedWrongSet(id: string, title: string): boolean {
  const cleanTitle = title.trim().slice(0, 80);
  if (!cleanTitle) return false;
  const items = loadSavedWrongSets();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return false;
  items[index] = { ...items[index], title: cleanTitle, updatedAt: new Date().toISOString() };
  saveSavedWrongSets(items);
  return true;
}

export function toggleSavedWrongSetBookmark(id: string): boolean {
  const items = loadSavedWrongSets();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return false;
  items[index] = {
    ...items[index],
    isBookmarked: !items[index].isBookmarked,
    updatedAt: new Date().toISOString(),
  };
  saveSavedWrongSets(items);
  return true;
}

export function deleteSavedWrongSet(id: string): boolean {
  const items = loadSavedWrongSets();
  const nextItems = items.filter((item) => item.id !== id);
  if (nextItems.length === items.length) return false;
  saveSavedWrongSets(nextItems);
  return true;
}

export function updateSavedWrongSetProgress(result: QuizResult): SavedWrongSetProgress | null {
  const setId = result.config.savedWrongSetId;
  const retryMode = result.config.retryMode;
  if (!setId || !retryMode) return null;

  const items = loadSavedWrongSets();
  const index = items.findIndex((item) => item.id === setId);
  if (index < 0) return null;

  const item = items[index];
  const originalIdSet = new Set(item.originalQuestionIds);
  const remaining = new Set(item.remainingQuestionIds);
  const mastered = new Set(item.masteredQuestionIds);
  const remainingBefore = remaining.size;
  const correctIds = new Set(result.correctQuestionIds);
  const sessionIds = result.questionIds.filter((id) => originalIdSet.has(id));
  const sessionIdSet = new Set(sessionIds);
  const unavailableRequestedIds = (result.config.questionIds ?? [])
    .filter((id) => originalIdSet.has(id) && !sessionIdSet.has(id));
  const unavailableOriginalIds = (result.config.unavailableQuestionIds ?? [])
    .filter((id) => originalIdSet.has(id));

  [...new Set([...unavailableRequestedIds, ...unavailableOriginalIds])].forEach((id) => {
    remaining.add(id);
    mastered.delete(id);
  });

  sessionIds.forEach((id) => {
    if (correctIds.has(id)) {
      remaining.delete(id);
      mastered.add(id);
    } else {
      remaining.add(id);
      mastered.delete(id);
    }
  });

  const order = item.originalQuestionOrder;
  const sortByOriginalOrder = (left: string, right: string) => order.indexOf(left) - order.indexOf(right);
  const remainingQuestionIds = [...remaining].sort(sortByOriginalOrder);
  const masteredQuestionIds = [...mastered].sort(sortByOriginalOrder);
  const now = new Date().toISOString();
  const updated: SavedWrongSet = {
    ...item,
    remainingQuestionIds,
    masteredQuestionIds,
    retryCount: item.retryCount + 1,
    lastRetriedAt: now,
    updatedAt: now,
    completedAt: remainingQuestionIds.length === 0 ? (item.completedAt ?? now) : undefined,
  };
  items[index] = updated;
  saveSavedWrongSets(items);

  return {
    savedWrongSetId: updated.id,
    title: updated.title,
    retryMode,
    originalWrongCount: updated.originalWrongCount,
    remainingBefore,
    remainingAfter: remainingQuestionIds.length,
    masteredCount: masteredQuestionIds.length,
    progressRate: updated.originalWrongCount === 0
      ? 0
      : (masteredQuestionIds.length / updated.originalWrongCount) * 100,
  };
}
