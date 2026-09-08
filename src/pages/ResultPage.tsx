import { Bookmark, Check, ClipboardList, FolderHeart, Home, Play, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { ResultSummary } from '../components/ResultSummary';
import type {
  QuizResult,
  SavedWrongSet,
  SavedWrongSetRetryMode,
  StudyRecord,
} from '../types/quiz';
import {
  formatRate,
  getConfigExamIds,
  getConfigSubjectNumbers,
  getSubjectSummary,
  getYearSummary,
} from '../utils/quizUtils';

interface ResultPageProps {
  result: QuizResult | null;
  studyRecord: StudyRecord | null;
  existingSavedSet: SavedWrongSet | null;
  currentWrongAnswerCount: number;
  onSaveWrongSet: (title: string, bookmarked: boolean) => boolean;
  onRetakeWrong: () => void;
  onRetakeExam: () => void;
  onRetrySavedSet: (setId: string, mode: SavedWrongSetRetryMode) => void;
  onDeleteSavedSet: (setId: string) => void;
  onGoWrongNotes: () => void;
  onGoSavedSets: () => void;
  onHome: () => void;
}

function makeDefaultTitle(result: QuizResult, wrongCount: number): string {
  if (result.config.source === 'saved-wrong-set') {
    return `${result.config.savedWrongSetTitle ?? '저장된 오답 세트'} 재풀이 오답 ${wrongCount}문제`;
  }
  if (result.config.source === 'wrong-note') {
    return `현재 오답노트 재풀이 오답 ${wrongCount}문제`;
  }
  const years = result.config.years?.length
    ? result.config.years
    : (result.yearStats ?? []).map((stat) => Number(stat.key));
  const examIds = getConfigExamIds(result.config);
  const subjects = getConfigSubjectNumbers(result.config);
  const subjectLabel = subjects.length > 1 && subjects.length < 5
    ? `${subjects.join('·')}과목`
    : getSubjectSummary(subjects);
  const examLabel = years.length === 1 && examIds.length === 1
    ? `${years[0]}년 ${result.exam.session}회`
    : getYearSummary(years);
  return `${examLabel} ${subjectLabel} 오답 ${wrongCount}문제`;
}

export function ResultPage({
  result,
  studyRecord,
  existingSavedSet,
  currentWrongAnswerCount,
  onSaveWrongSet,
  onRetakeWrong,
  onRetakeExam,
  onRetrySavedSet,
  onDeleteSavedSet,
  onGoWrongNotes,
  onGoSavedSets,
  onHome,
}: ResultPageProps) {
  const [setTitle, setSetTitle] = useState(() => result
    ? makeDefaultTitle(result, studyRecord?.wrongQuestionIds?.length ?? result.wrongQuestions.length)
    : '');
  const [bookmarked, setBookmarked] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  if (!result) {
    return (
      <main className="page-shell">
        <section className="empty-panel">
          <h1>표시할 결과가 없습니다</h1>
          <button className="button primary" type="button" onClick={onHome}>
            <Home size={18} aria-hidden="true" />
            메인으로
          </button>
        </section>
      </main>
    );
  }

  const resultYears = result.config.years?.length
    ? result.config.years
    : (result.yearStats ?? []).map((stat) => Number(stat.key));
  const resultTitle = result.config.source === 'saved-wrong-set'
    ? `${result.config.savedWrongSetTitle ?? '저장된 오답 세트'} 재풀이 결과`
    : result.config.source === 'wrong-note'
      ? result.config.wrongNoteRetryMode === 'selected'
        ? '선택한 오답 재풀이 결과'
        : '현재 오답노트 전체 재풀이 결과'
    : resultYears.length > 1
      ? `${getYearSummary(resultYears)} 학습 결과`
      : result.exam.title;
  const wrongIds = studyRecord?.wrongQuestionIds;
  const isWrongSetSaveSource = result.config.source === 'exam' ||
    result.config.source === 'wrong-note' ||
    result.config.source === 'saved-wrong-set';
  const canSaveSet = isWrongSetSaveSource && Array.isArray(wrongIds) && wrongIds.length > 0;
  const missingAttemptData = isWrongSetSaveSource && (!studyRecord || !Array.isArray(wrongIds));
  const progress = result.savedWrongSetProgress;

  const handleSave = () => {
    if (onSaveWrongSet(setTitle, bookmarked)) {
      setSaveMessage(result.config.source === 'exam'
        ? `오답 ${wrongIds?.length ?? 0}문제를 세트로 저장했습니다.`
        : result.config.source === 'wrong-note'
          ? `이번 재풀이에서 틀린 ${wrongIds?.length ?? 0}문제를 오답 세트로 저장했습니다.`
          : `이번 재풀이에서 틀린 ${wrongIds?.length ?? 0}문제를 새 오답 세트로 저장했습니다.`);
    }
  };

  const handleDeleteSet = () => {
    if (!progress || !window.confirm(
      '이 오답 세트를 삭제하시겠습니까?\n저장된 최초 오답 목록과 복습 진행 상태가 삭제됩니다.\n기존 오답노트에는 영향을 주지 않습니다.',
    )) return;
    onDeleteSavedSet(progress.savedWrongSetId);
  };

  return (
    <main className="page-shell">
      <section className="page-heading">
        <p className="eyebrow">풀이 결과</p>
        <h1>{resultTitle}</h1>
      </section>

      <ResultSummary result={result} />

      {progress ? (
        <section className="saved-retry-summary" aria-label="저장된 오답 세트 재풀이 결과">
          <div className="section-heading"><FolderHeart size={20} /><h2>오답 세트 복습</h2></div>
          <dl>
            <div><dt>오답 세트</dt><dd>{progress.title}</dd></div>
            <div><dt>재풀이 모드</dt><dd>{progress.retryMode === 'all' ? '최초 오답 전체' : '남은 문제만'}</dd></div>
            <div><dt>이번 출제</dt><dd>{result.total}문제</dd></div>
            <div><dt>이번 결과</dt><dd>정답 {result.correct} · 오답 {result.wrongQuestionIds.length}</dd></div>
            <div><dt>최초 오답</dt><dd>{progress.originalWrongCount}문제</dd></div>
            <div><dt>남은 문제</dt><dd>{progress.remainingBefore} → {progress.remainingAfter}</dd></div>
            <div><dt>복습 진행률</dt><dd>{formatRate(progress.progressRate)}</dd></div>
          </dl>
          {progress.remainingAfter === 0 ? (
            <p className="completion-message"><Check size={19} /> 저장된 오답 세트의 모든 문제를 맞혔습니다.</p>
          ) : null}
        </section>
      ) : null}

      {result.config.source === 'wrong-note' ? (
        <section className="saved-retry-summary" aria-label="현재 오답노트 재풀이 결과">
          <div className="section-heading"><ClipboardList size={20} /><h2>현재 오답노트 재풀이</h2></div>
          <dl>
            <div><dt>학습 유형</dt><dd>{result.config.wrongNoteRetryMode === 'selected' ? '선택한 오답 재풀이' : '현재 오답노트 전체 재풀이'}</dd></div>
            <div><dt>이번 출제</dt><dd>{result.total}문제</dd></div>
            <div><dt>이번 정답</dt><dd>{result.correct}문제</dd></div>
            <div><dt>이번 오답</dt><dd>{result.wrongQuestionIds.length}문제</dd></div>
            <div><dt>현재 오답노트</dt><dd>{currentWrongAnswerCount}문제</dd></div>
          </dl>
        </section>
      ) : null}

      {isWrongSetSaveSource ? (
        <section className="save-wrong-set-panel" aria-label="이번 오답 세트 저장">
          <div className="section-heading"><Save size={20} /><h2>이번 오답 세트 저장</h2></div>
          {missingAttemptData ? (
            <p className="notice-text">이 학습 기록에는 문제별 오답 정보가 없어 오답 세트를 저장할 수 없습니다.</p>
          ) : null}
          {!missingAttemptData && (wrongIds?.length ?? 0) === 0 ? (
            <p className="empty-state">저장할 오답이 없습니다.</p>
          ) : null}
          {canSaveSet ? (
            <div className="save-set-form">
              <label className="field">
                <span>오답 세트 이름</span>
                <input value={setTitle} maxLength={80} onChange={(event) => setSetTitle(event.target.value)} disabled={Boolean(existingSavedSet)} />
              </label>
              <label className="toggle">
                <input type="checkbox" checked={bookmarked} onChange={(event) => setBookmarked(event.target.checked)} disabled={Boolean(existingSavedSet)} />
                <Bookmark size={17} /> 북마크
              </label>
              <button className="button primary" type="button" onClick={handleSave} disabled={!setTitle.trim() || Boolean(existingSavedSet)}>
                {existingSavedSet ? <Check size={18} /> : <Save size={18} />}
                {existingSavedSet ? '저장됨' : `이번 오답 세트 저장 · ${wrongIds?.length ?? 0}문제`}
              </button>
            </div>
          ) : null}
          {saveMessage ? <p className="success-message" role="status">{saveMessage}</p> : null}
        </section>
      ) : null}

      <section className="wrong-result-panel" aria-label="틀린 문제 목록">
        <div className="section-heading">
          <ClipboardList size={20} aria-hidden="true" />
          <h2>틀린 문제 목록</h2>
        </div>
        {result.wrongQuestions.length === 0 ? (
          <p className="empty-state">틀린 문제가 없습니다.</p>
        ) : (
          <div className="wrong-list">
            {result.wrongQuestions.map(({ question, answer }) => (
              <article className="wrong-item" key={question.id}>
                <div className="wrong-item-main">
                  <div className="question-meta">
                    <span>{question.exam.year}년 {question.exam.session}회</span>
                    <span>{question.subject}</span>
                    <span>{question.number}번</span>
                  </div>
                  <h3>{question.question}</h3>
                  <p>선택: {answer ? `${answer.selectedChoice}번` : '미응답'} · 정답: {question.answer}번</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="result-actions">
        <button className="button primary" type="button" onClick={onRetakeWrong} disabled={result.wrongQuestions.length === 0}>
          <Play size={18} /> 이번에 틀린 문제 다시 풀기
        </button>
        {progress ? (
          <>
            <button className="button secondary" type="button" onClick={() => onRetrySavedSet(progress.savedWrongSetId, 'remaining')} disabled={progress.remainingAfter === 0}>
              <Play size={18} /> 현재 남은 문제 다시 풀기
            </button>
            <button className="button secondary" type="button" onClick={() => onRetrySavedSet(progress.savedWrongSetId, 'all')}>
              <RotateCcw size={18} /> 최초 오답 전체 다시 풀기
            </button>
            <button className="button secondary" type="button" onClick={onGoSavedSets}><FolderHeart size={18} /> 오답 세트로 돌아가기</button>
            <button className="button danger" type="button" onClick={handleDeleteSet}>세트 삭제</button>
          </>
        ) : (
          <button className="button secondary" type="button" onClick={onRetakeExam} disabled={result.config.source !== 'exam'}>
            <RotateCcw size={18} /> 같은 시험 다시 풀기
          </button>
        )}
        {!progress ? (
          <button className="button secondary" type="button" onClick={onGoSavedSets}><FolderHeart size={18} /> 저장된 오답 세트 보기</button>
        ) : null}
        <button className="button secondary" type="button" onClick={onGoWrongNotes}><ClipboardList size={18} /> {result.config.source === 'wrong-note' ? '현재 오답노트로 돌아가기' : '오답노트'}</button>
        <button className="button secondary" type="button" onClick={onHome}><Home size={18} /> 메인으로</button>
      </div>
    </main>
  );
}
