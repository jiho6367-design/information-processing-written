export type SubjectNumber = 1 | 2 | 3 | 4 | 5;
export type ChoiceNumber = 1 | 2 | 3 | 4;
export type QuestionCountOption = 10 | 20 | 40 | 60 | 100 | 'all';
export type QuizSourceType = 'exam' | 'wrong-note' | 'saved-wrong-set';
export type WrongNoteRetryMode = 'all' | 'selected';
export type SavedWrongSetRetryMode = 'all' | 'remaining';
export type SavedWrongSetOrder = 'original' | 'exam' | 'random';

export const SUBJECTS: ReadonlyArray<{ number: SubjectNumber; name: string }> = [
  { number: 1, name: '소프트웨어 설계' },
  { number: 2, name: '소프트웨어 개발' },
  { number: 3, name: '데이터베이스 구축' },
  { number: 4, name: '프로그래밍 언어 활용' },
  { number: 5, name: '정보시스템 구축 관리' },
];

export interface ExamMeta {
  year: number;
  session: number;
  title: string;
}

export interface QuestionTable {
  title?: string;
  headers: string[];
  rows: string[][];
}

export interface Question {
  id: string;
  number: number;
  subjectNumber: SubjectNumber;
  subject: string;
  question: string;
  code?: string | null;
  table?: QuestionTable | null;
  tables?: QuestionTable[] | null;
  tableSeparator?: string | null;
  choices: [string, string, string, string];
  choiceImages?: [string | null, string | null, string | null, string | null] | null;
  choiceTables?: [QuestionTable | null, QuestionTable | null, QuestionTable | null, QuestionTable | null] | null;
  answer: ChoiceNumber;
  answerNote?: string | null;
  explanation?: string;
  image?: string | null;
  needsReview?: boolean;
}

export interface ExamData {
  exam: ExamMeta;
  questions: Question[];
}

export interface LoadedExam extends ExamData {
  id: string;
  fileName: string;
}

export interface QuizChoice {
  displayNumber: ChoiceNumber;
  originalNumber: ChoiceNumber;
  text: string;
  image?: string | null;
  table?: QuestionTable | null;
}

export interface RuntimeQuestion extends Question {
  examId: string;
  exam: ExamMeta;
  runtimeChoices: QuizChoice[];
}

export interface QuizConfig {
  /** Legacy primary exam id. Keep this field so saved single-exam sessions remain readable. */
  examId: string;
  examIds?: string[];
  years?: number[];
  source: QuizSourceType;
  /** Legacy single subject. New exam quizzes use subjectNumbers. */
  subjectNumber?: SubjectNumber;
  subjectNumbers?: SubjectNumber[];
  count: QuestionCountOption;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
  questionIds?: string[];
  autoRemoveWrongOnCorrect?: boolean;
  savedWrongSetId?: string;
  savedWrongSetTitle?: string;
  retryMode?: SavedWrongSetRetryMode;
  questionOrder?: SavedWrongSetOrder;
  remainingCountAtStart?: number;
  unavailableQuestionIds?: string[];
  wrongNoteRetryMode?: WrongNoteRetryMode;
}

export interface QuizFilterState {
  selectedYears: number[];
  selectedExamKeys: string[];
  selectedSubjectNumbers: SubjectNumber[];
  count: QuestionCountOption;
  shuffleQuestions: boolean;
  shuffleChoices: boolean;
}

export interface QuizAnswer {
  questionId: string;
  selectedChoice: ChoiceNumber;
  selectedDisplayNumber: ChoiceNumber;
  isCorrect: boolean;
  answeredAt: string;
}

export interface QuizSession {
  id: string;
  config: QuizConfig;
  questions: RuntimeQuestion[];
  currentIndex: number;
  answers: Record<string, QuizAnswer>;
  startedAt: string;
}

export interface SubjectStat {
  subjectNumber: SubjectNumber;
  subject: string;
  total: number;
  correct: number;
  wrong: number;
  correctRate: number;
}

export interface ScopeStat {
  key: string;
  label: string;
  total: number;
  correct: number;
  wrong: number;
  correctRate: number;
}

export interface QuizResultQuestion {
  question: RuntimeQuestion;
  answer?: QuizAnswer;
}

export interface QuizResult {
  sessionId: string;
  config: QuizConfig;
  exam: ExamMeta;
  startedAt: string;
  completedAt: string;
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  correctRate: number;
  subjectStats: SubjectStat[];
  yearStats: ScopeStat[];
  examStats: ScopeStat[];
  wrongQuestions: QuizResultQuestion[];
  questionIds: string[];
  correctQuestionIds: string[];
  wrongQuestionIds: string[];
  savedWrongSetProgress?: SavedWrongSetProgress;
}

export interface SavedWrongSetProgress {
  savedWrongSetId: string;
  title: string;
  retryMode: SavedWrongSetRetryMode;
  originalWrongCount: number;
  remainingBefore: number;
  remainingAfter: number;
  masteredCount: number;
  progressRate: number;
}

export interface WrongAnswerNote {
  questionId: string;
  examId: string;
  exam: ExamMeta;
  question: Question;
  selectedChoice: ChoiceNumber;
  addedAt: string;
  updatedAt: string;
  wrongCount: number;
  correctCount: number;
  attempts: number;
}

export interface StudyRecord {
  id: string;
  completedAt: string;
  examTitle: string;
  year: number;
  session: number;
  subjectLabel: string;
  years?: number[];
  examIds?: string[];
  subjectNumbers?: SubjectNumber[];
  source: QuizConfig['source'];
  total: number;
  correct: number;
  wrong: number;
  correctRate: number;
  attemptId?: string;
  questionIds?: string[];
  correctQuestionIds?: string[];
  wrongQuestionIds?: string[];
  sourceType?: QuizSourceType;
  savedWrongSetId?: string;
  createdSavedWrongSetId?: string;
  savedWrongSetTitle?: string;
  retryMode?: SavedWrongSetRetryMode;
  remainingCountBefore?: number;
  remainingCountAfter?: number;
}

export interface SavedWrongSet {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  sourceAttemptId?: string;
  sourceType?: QuizSourceType;
  years: number[];
  examKeys: string[];
  subjectNumbers: SubjectNumber[];
  originalQuestionIds: string[];
  originalQuestionOrder: string[];
  remainingQuestionIds: string[];
  masteredQuestionIds: string[];
  originalWrongCount: number;
  retryCount: number;
  lastRetriedAt?: string;
  completedAt?: string;
  isBookmarked: boolean;
}

export interface SavedWrongSetsStore {
  version: 1;
  items: SavedWrongSet[];
}
