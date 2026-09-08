import { BookOpen, ClipboardList, Play, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ExamSelector } from '../components/ExamSelector';
import type {
  LoadedExam,
  QuizConfig,
  QuizFilterState,
  StudyRecord,
  SubjectNumber,
} from '../types/quiz';
import { SUBJECTS } from '../types/quiz';
import {
  formatRate,
  getFilteredExamQuestions,
  getYearSummary,
  questionMatchesSearch,
} from '../utils/quizUtils';
import { loadQuizFilterState, saveQuizFilterState } from '../utils/storageUtils';

interface HomePageProps {
  exams: LoadedExam[];
  studyRecords: StudyRecord[];
  wrongAnswerCount: number;
  savedWrongSetCount: number;
  onStartQuiz: (config: QuizConfig) => void;
  onGoWrongNotes: () => void;
  onGoSavedWrongSets: () => void;
  onClearRecords: () => void;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRecordScope(record: StudyRecord): string {
  if (record.sourceType === 'saved-wrong-set') {
    return `오답 세트 복습 · ${record.savedWrongSetTitle ?? '저장된 오답 세트'} · 남은 문제 ${record.remainingCountBefore ?? '?'} → ${record.remainingCountAfter ?? '?'}`;
  }
  if (record.years?.length) {
    return `${getYearSummary(record.years)} · ${record.subjectLabel} · ${record.total}문제`;
  }

  return `${record.examTitle} · ${record.subjectLabel} · ${record.total}문제`;
}

export function HomePage({
  exams,
  studyRecords,
  wrongAnswerCount,
  savedWrongSetCount,
  onStartQuiz,
  onGoWrongNotes,
  onGoSavedWrongSets,
  onClearRecords,
}: HomePageProps) {
  const ensureValidCount = (state: QuizFilterState): QuizFilterState => {
    const availableCount = getFilteredExamQuestions(
      exams,
      state.selectedExamKeys,
      state.selectedSubjectNumbers,
    ).length;
    return state.count !== 'all' && state.count > availableCount
      ? { ...state, count: 'all' }
      : state;
  };
  const [filter, setFilter] = useState<QuizFilterState>(() =>
    ensureValidCount(loadQuizFilterState(exams)),
  );
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPool = useMemo(
    () => getFilteredExamQuestions(exams, filter.selectedExamKeys, filter.selectedSubjectNumbers),
    [exams, filter.selectedExamKeys, filter.selectedSubjectNumbers],
  );
  const searchedPool = useMemo(
    () => filteredPool.filter((item) => questionMatchesSearch(item.question, searchTerm)),
    [filteredPool, searchTerm],
  );
  const canStart =
    filter.selectedYears.length > 0 &&
    filter.selectedExamKeys.length > 0 &&
    filter.selectedSubjectNumbers.length > 0 &&
    filteredPool.length > 0;

  useEffect(() => {
    saveQuizFilterState(filter);
  }, [filter]);

  const updateFilter = (changes: Partial<QuizFilterState>) => {
    setFilter((current) => ensureValidCount({ ...current, ...changes }));
  };

  const selectYears = (years: number[]) => {
    const yearSet = new Set(years);
    updateFilter({
      selectedYears: [...yearSet].sort((a, b) => b - a),
      selectedExamKeys: exams.filter((exam) => yearSet.has(exam.exam.year)).map((exam) => exam.id),
    });
  };

  const toggleYear = (year: number) => {
    setFilter((current) => {
      const isSelected = current.selectedYears.includes(year);
      const yearExamIds = exams.filter((exam) => exam.exam.year === year).map((exam) => exam.id);
      return ensureValidCount({
        ...current,
        selectedYears: isSelected
          ? current.selectedYears.filter((item) => item !== year)
          : [...current.selectedYears, year].sort((a, b) => b - a),
        selectedExamKeys: isSelected
          ? current.selectedExamKeys.filter((examId) => !yearExamIds.includes(examId))
          : [...new Set([...current.selectedExamKeys, ...yearExamIds])],
      });
    });
  };

  const setYearExams = (year: number, selected: boolean) => {
    const yearExamIds = exams.filter((exam) => exam.exam.year === year).map((exam) => exam.id);
    setFilter((current) => ensureValidCount({
      ...current,
      selectedExamKeys: selected
        ? [...new Set([...current.selectedExamKeys, ...yearExamIds])]
        : current.selectedExamKeys.filter((examId) => !yearExamIds.includes(examId)),
    }));
  };

  const toggleSubject = (subject: SubjectNumber) => {
    setFilter((current) => ensureValidCount({
      ...current,
      selectedSubjectNumbers: current.selectedSubjectNumbers.includes(subject)
        ? current.selectedSubjectNumbers.filter((item) => item !== subject)
        : [...current.selectedSubjectNumbers, subject].sort((a, b) => a - b),
    }));
  };

  const makeConfig = (questionIds?: string[]): QuizConfig | null => {
    if (!canStart || (questionIds && questionIds.length === 0)) {
      return null;
    }

    return {
      examId: filter.selectedExamKeys[0],
      examIds: filter.selectedExamKeys,
      years: filter.selectedYears,
      source: 'exam',
      subjectNumber: filter.selectedSubjectNumbers.length === 1
        ? filter.selectedSubjectNumbers[0]
        : undefined,
      subjectNumbers: filter.selectedSubjectNumbers,
      count: filter.count,
      shuffleQuestions: filter.shuffleQuestions,
      shuffleChoices: filter.shuffleChoices,
      questionIds,
    };
  };

  const startQuiz = (questionIds?: string[]) => {
    const config = makeConfig(questionIds);
    if (config) onStartQuiz(config);
  };

  if (exams.length === 0) {
    return (
      <main className="page-shell">
        <section className="empty-panel">
          <h1>문제 데이터가 없습니다</h1>
          <p>`src/data/exams` 폴더에 시험 JSON 파일을 추가한 뒤 다시 실행하세요.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">개인 학습용 로컬 퀴즈</p>
          <h1>정보처리기사 필기 기출문제</h1>
          <p>연도, 회차, 과목을 조합해 풀면 오답노트와 최근 학습 기록이 자동 저장됩니다.</p>
        </div>
        <div className="hero-stats" aria-label="학습 현황">
          <span><strong>{exams.length}</strong>시험 파일</span>
          <span><strong>{wrongAnswerCount}</strong>오답노트</span>
          <span><strong>{savedWrongSetCount}</strong>오답 세트</span>
          <span><strong>{studyRecords.slice(0, 10).length}</strong>최근 기록</span>
        </div>
      </section>

      <div className="two-column-layout">
        <div className="main-column">
          <ExamSelector
            exams={exams}
            filter={filter}
            availableQuestionCount={filteredPool.length}
            onToggleYear={toggleYear}
            onSelectYears={selectYears}
            onClearYears={() => updateFilter({ selectedYears: [], selectedExamKeys: [] })}
            onToggleExam={(examId) => updateFilter({
              selectedExamKeys: filter.selectedExamKeys.includes(examId)
                ? filter.selectedExamKeys.filter((item) => item !== examId)
                : [...filter.selectedExamKeys, examId],
            })}
            onSetYearExams={setYearExams}
            onSelectAllExams={() => updateFilter({
              selectedExamKeys: exams
                .filter((exam) => filter.selectedYears.includes(exam.exam.year))
                .map((exam) => exam.id),
            })}
            onClearExams={() => updateFilter({ selectedExamKeys: [] })}
            onToggleSubject={toggleSubject}
            onSelectAllSubjects={() => updateFilter({
              selectedSubjectNumbers: SUBJECTS.map((subject) => subject.number),
            })}
            onClearSubjects={() => updateFilter({ selectedSubjectNumbers: [] })}
            onCountChange={(count) => updateFilter({ count })}
            onShuffleQuestionsChange={(shuffleQuestions) => updateFilter({ shuffleQuestions })}
            onShuffleChoicesChange={(shuffleChoices) => updateFilter({ shuffleChoices })}
          />

          <section className="action-panel" aria-label="문제 풀기">
            <div className="section-heading">
              <BookOpen size={20} aria-hidden="true" />
              <h2>문제 풀기</h2>
            </div>
            <div className="action-grid">
              <button className="button primary" type="button" onClick={() => startQuiz()} disabled={!canStart}>
                <Play size={18} aria-hidden="true" />
                선택한 범위 학습 시작
              </button>
              <button className="button secondary" type="button" onClick={onGoWrongNotes}>
                <ClipboardList size={18} aria-hidden="true" />
                오답노트
              </button>
              <button className="button secondary" type="button" onClick={onGoSavedWrongSets}>
                <ClipboardList size={18} aria-hidden="true" />
                저장된 오답 세트
              </button>
            </div>
          </section>

          <section className="search-panel" aria-label="문제 검색">
            <div className="section-heading">
              <Search size={20} aria-hidden="true" />
              <h2>선택 범위에서 문제 검색</h2>
            </div>
            <label className="field">
              <span>검색어</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="문제, 보기, 해설에서 검색"
              />
            </label>
            <div className="search-result-row">
              <span>{searchedPool.length}문제가 조건과 일치합니다.</span>
              <button
                className="button secondary"
                type="button"
                disabled={!canStart || searchedPool.length === 0}
                onClick={() => startQuiz(searchedPool.map((item) => item.question.id))}
              >
                <Play size={16} aria-hidden="true" />
                검색 결과 풀기
              </button>
            </div>
          </section>
        </div>

        <aside className="side-column" aria-label="최근 학습 기록">
          <section className="history-panel">
            <div className="section-heading">
              <ClipboardList size={20} aria-hidden="true" />
              <h2>최근 학습 기록</h2>
            </div>
            {studyRecords.length === 0 ? (
              <p className="empty-state">아직 저장된 학습 기록이 없습니다.</p>
            ) : (
              <div className="history-list">
                {studyRecords.slice(0, 10).map((record) => (
                  <article className="history-item" key={record.id}>
                    <div>
                      <strong>{formatRecordScope(record)}</strong>
                      <time dateTime={record.completedAt}>{formatDate(record.completedAt)}</time>
                    </div>
                    <b>{record.correct}/{record.total} · {formatRate(record.correctRate)}</b>
                  </article>
                ))}
              </div>
            )}
            <button
              className="button danger full-width"
              type="button"
              onClick={onClearRecords}
              disabled={studyRecords.length === 0}
            >
              <Trash2 size={16} aria-hidden="true" />
              기록 초기화
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
