import { ClipboardList, FolderHeart, Home, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useReducer, useState } from 'react';
import { loadExams } from './data/exams';
import { HomePage } from './pages/HomePage';
import { QuizPage } from './pages/QuizPage';
import { ResultPage } from './pages/ResultPage';
import { SavedWrongSetsPage } from './pages/SavedWrongSetsPage';
import { WrongAnswerPage } from './pages/WrongAnswerPage';
import type {
  LoadedExam,
  QuizConfig,
  QuizResult,
  QuizSession,
  SavedWrongSetOrder,
  SavedWrongSetRetryMode,
} from './types/quiz';
import {
  clearCurrentSession,
  clearStudyRecords,
  createSavedWrongSet,
  deleteSavedWrongSet,
  findStudyRecordByAttemptId,
  loadCurrentSession,
  loadLastResult,
  loadSavedWrongSets,
  loadStudyRecords,
  loadWrongAnswerNotes,
} from './utils/storageUtils';

type Page = 'home' | 'quiz' | 'result' | 'wrong-notes' | 'saved-wrong-sets';

export default function App() {
  const [restoredSession, setRestoredSession] = useState<QuizSession | null>(() => loadCurrentSession());
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(() => restoredSession?.config ?? null);
  const [page, setPage] = useState<Page>(() => (restoredSession ? 'quiz' : 'home'));
  const [lastResult, setLastResult] = useState<QuizResult | null>(() => loadLastResult());
  const [exams, setExams] = useState<LoadedExam[]>([]);
  const [examLoadError, setExamLoadError] = useState<string | null>(null);
  const [isLoadingExams, setIsLoadingExams] = useState(true);
  const [, refreshStorage] = useReducer((version: number) => version + 1, 0);

  const wrongAnswerNotes = loadWrongAnswerNotes();
  const studyRecords = loadStudyRecords();
  const validQuestionIds = useMemo(
    () => new Set(exams.flatMap((exam) => exam.questions.map((question) => question.id))),
    [exams],
  );
  const savedWrongSets = loadSavedWrongSets(exams.length > 0 ? validQuestionIds : undefined);
  const resultStudyRecord = lastResult
    ? findStudyRecordByAttemptId(lastResult.sessionId) ?? null
    : null;
  const existingResultSet = resultStudyRecord
    ? savedWrongSets.find((set) => set.sourceAttemptId === resultStudyRecord.id) ?? null
    : null;

  useEffect(() => {
    let isMounted = true;

    loadExams()
      .then((loadedExams) => {
        if (!isMounted) {
          return;
        }

        setExams(loadedExams);
        setExamLoadError(null);
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        setExamLoadError(error instanceof Error ? error.message : '시험 데이터를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingExams(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const startQuiz = (config: QuizConfig) => {
    clearCurrentSession();
    setRestoredSession(null);
    setQuizConfig(config);
    setPage('quiz');
  };

  const goHome = () => {
    setPage('home');
  };

  const exitQuiz = () => {
    if (!window.confirm('진행 중인 풀이를 종료하고 메인으로 이동할까요?')) {
      return;
    }

    clearCurrentSession();
    setRestoredSession(null);
    setQuizConfig(null);
    setPage('home');
  };

  const completeQuiz = (result: QuizResult) => {
    setLastResult(result);
    setQuizConfig(null);
    setRestoredSession(null);
    refreshStorage();
    setPage('result');
  };

  const clearRecords = () => {
    if (!window.confirm('최근 학습 기록을 모두 삭제할까요?')) {
      return;
    }

    clearStudyRecords();
    refreshStorage();
  };

  const retakeWrongQuestions = () => {
    if (!lastResult || lastResult.wrongQuestions.length === 0) {
      return;
    }

    const savedSet = lastResult.config.savedWrongSetId
      ? savedWrongSets.find((set) => set.id === lastResult.config.savedWrongSetId)
      : undefined;
    startQuiz({
      ...lastResult.config,
      count: 'all',
      shuffleQuestions: false,
      questionIds: lastResult.wrongQuestions.map(({ question }) => question.id),
      autoRemoveWrongOnCorrect: false,
      remainingCountAtStart: savedSet?.remainingQuestionIds.length,
    });
  };

  const retakeSameExam = () => {
    if (!lastResult || lastResult.config.source !== 'exam') {
      return;
    }

    startQuiz({
      ...lastResult.config,
      questionIds: undefined,
    });
  };

  const startSavedWrongSet = (
    setId: string,
    mode: SavedWrongSetRetryMode,
    order: SavedWrongSetOrder = 'original',
  ) => {
    const set = loadSavedWrongSets(validQuestionIds).find((item) => item.id === setId);
    if (!set) return;
    const selectedIds = mode === 'all'
      ? set.originalQuestionOrder
      : set.originalQuestionOrder.filter((id) => set.remainingQuestionIds.includes(id));
    const examIds = set.examKeys.length > 0
      ? set.examKeys
      : [...new Set(set.originalQuestionIds.map((id) => id.split('-').slice(0, 2).join('-')))];
    if (selectedIds.length === 0 || examIds.length === 0) return;

    startQuiz({
      examId: examIds[0],
      examIds,
      years: set.years,
      source: 'saved-wrong-set',
      subjectNumbers: set.subjectNumbers,
      count: 'all',
      shuffleQuestions: order === 'random',
      shuffleChoices: false,
      questionIds: selectedIds,
      questionOrder: order,
      savedWrongSetId: set.id,
      savedWrongSetTitle: set.title,
      retryMode: mode,
      remainingCountAtStart: set.remainingQuestionIds.length,
      unavailableQuestionIds: set.originalQuestionIds.filter((id) => !validQuestionIds.has(id)),
    });
  };

  const saveResultAsWrongSet = (title: string, bookmarked: boolean): boolean => {
    if (!resultStudyRecord) return false;
    const saved = createSavedWrongSet(resultStudyRecord, title, bookmarked);
    if (!saved) return false;
    refreshStorage();
    return true;
  };

  const removeSavedWrongSet = (setId: string) => {
    deleteSavedWrongSet(setId);
    refreshStorage();
  };

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={goHome}>
          <Home size={20} aria-hidden="true" />
          정보처리기사 필기
        </button>
        <nav className="app-nav" aria-label="주요 화면">
          <button className="icon-text-button" type="button" onClick={goHome}>
            <Home size={17} aria-hidden="true" />
            메인
          </button>
          <button className="icon-text-button" type="button" onClick={() => setPage('wrong-notes')}>
            <ClipboardList size={17} aria-hidden="true" />
            오답노트
          </button>
          <button className="icon-text-button" type="button" onClick={() => setPage('saved-wrong-sets')}>
            <FolderHeart size={17} aria-hidden="true" />
            저장된 오답 세트
          </button>
          <button
            className="icon-text-button"
            type="button"
            onClick={() => setPage('result')}
            disabled={!lastResult}
          >
            <RotateCcw size={17} aria-hidden="true" />
            최근 결과
          </button>
        </nav>
      </header>

      {isLoadingExams ? (
        <main className="page-shell">
          <section className="empty-panel">
            <h1>시험 데이터를 불러오는 중입니다</h1>
          </section>
        </main>
      ) : null}

      {examLoadError ? (
        <main className="page-shell">
          <section className="empty-panel">
            <h1>시험 데이터를 불러오지 못했습니다</h1>
            <p>{examLoadError}</p>
          </section>
        </main>
      ) : null}

      {!isLoadingExams && !examLoadError && page === 'home' ? (
        <HomePage
          exams={exams}
          studyRecords={studyRecords}
          wrongAnswerCount={wrongAnswerNotes.length}
          savedWrongSetCount={savedWrongSets.length}
          onStartQuiz={startQuiz}
          onGoWrongNotes={() => setPage('wrong-notes')}
          onGoSavedWrongSets={() => setPage('saved-wrong-sets')}
          onClearRecords={clearRecords}
        />
      ) : null}

      {!isLoadingExams && !examLoadError && page === 'quiz' && quizConfig ? (
        <QuizPage
          config={quizConfig}
          exams={exams}
          wrongAnswerNotes={wrongAnswerNotes}
          initialSession={restoredSession}
          onComplete={completeQuiz}
          onExit={exitQuiz}
        />
      ) : null}

      {!isLoadingExams && !examLoadError && page === 'result' ? (
        <ResultPage
          result={lastResult}
          studyRecord={resultStudyRecord}
          existingSavedSet={existingResultSet}
          currentWrongAnswerCount={wrongAnswerNotes.length}
          onSaveWrongSet={saveResultAsWrongSet}
          onRetakeWrong={retakeWrongQuestions}
          onRetakeExam={retakeSameExam}
          onRetrySavedSet={(setId, mode) => startSavedWrongSet(setId, mode)}
          onDeleteSavedSet={(setId) => { removeSavedWrongSet(setId); setPage('saved-wrong-sets'); }}
          onGoWrongNotes={() => setPage('wrong-notes')}
          onGoSavedSets={() => setPage('saved-wrong-sets')}
          onHome={goHome}
        />
      ) : null}

      {!isLoadingExams && !examLoadError && page === 'wrong-notes' ? (
        <WrongAnswerPage
          notes={wrongAnswerNotes}
          onStartQuiz={startQuiz}
          onBack={goHome}
          onGoSavedSets={() => setPage('saved-wrong-sets')}
          onRefresh={refreshStorage}
        />
      ) : null}

      {!isLoadingExams && !examLoadError && page === 'saved-wrong-sets' ? (
        <SavedWrongSetsPage
          sets={savedWrongSets}
          exams={exams}
          onStart={startSavedWrongSet}
          onBack={goHome}
          onRefresh={refreshStorage}
        />
      ) : null}
    </div>
  );
}
