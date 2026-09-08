import {
  AlertTriangle,
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  List,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type {
  LoadedExam,
  SavedWrongSet,
  SavedWrongSetOrder,
  SavedWrongSetRetryMode,
  SubjectNumber,
} from '../types/quiz';
import { SUBJECTS } from '../types/quiz';
import { formatRate, getSubjectSummary, getYearSummary } from '../utils/quizUtils';
import {
  deleteSavedWrongSet,
  renameSavedWrongSet,
  toggleSavedWrongSetBookmark,
} from '../utils/storageUtils';

interface SavedWrongSetsPageProps {
  sets: SavedWrongSet[];
  exams: LoadedExam[];
  onStart: (setId: string, mode: SavedWrongSetRetryMode, order: SavedWrongSetOrder) => void;
  onBack: () => void;
  onRefresh: () => void;
}

type StatusFilter = 'all' | 'remaining' | 'mastered';
type NumberFilter = 'all' | number;

function formatDate(value?: string): string {
  if (!value) return '없음';
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value));
}

export function SavedWrongSetsPage({
  sets,
  exams,
  onStart,
  onBack,
  onRefresh,
}: SavedWrongSetsPageProps) {
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [detailQuestionId, setDetailQuestionId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState<NumberFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState<'all' | SubjectNumber>('all');
  const [orders, setOrders] = useState<Record<string, SavedWrongSetOrder>>({});

  const questionMap = useMemo(() => {
    const map = new Map<string, { exam: LoadedExam['exam']; examId: string; question: LoadedExam['questions'][number] }>();
    exams.forEach((exam) => exam.questions.forEach((question) => {
      map.set(question.id, { exam: exam.exam, examId: exam.id, question });
    }));
    return map;
  }, [exams]);

  const beginRename = (set: SavedWrongSet) => {
    setEditingSetId(set.id);
    setEditingTitle(set.title);
  };

  const commitRename = (setId: string) => {
    if (renameSavedWrongSet(setId, editingTitle)) {
      setEditingSetId(null);
      onRefresh();
    }
  };

  const handleDelete = (set: SavedWrongSet) => {
    if (!window.confirm(
      `이 오답 세트를 삭제하시겠습니까?\n저장된 최초 오답 목록과 복습 진행 상태가 삭제됩니다.\n기존 오답노트에는 영향을 주지 않습니다.`,
    )) return;
    deleteSavedWrongSet(set.id);
    if (expandedSetId === set.id) setExpandedSetId(null);
    onRefresh();
  };

  const toggleDetails = (setId: string) => {
    setExpandedSetId((current) => current === setId ? null : setId);
    setDetailQuestionId(null);
    setStatusFilter('all');
    setYearFilter('all');
    setSubjectFilter('all');
  };

  const completedCount = sets.filter((set) => {
    const missing = set.originalQuestionIds.filter((id) => !questionMap.has(id)).length;
    return set.remainingQuestionIds.length === 0 && missing === 0;
  }).length;

  return (
    <main className="page-shell">
      <section className="page-heading">
        <button className="icon-text-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          메인으로
        </button>
        <p className="eyebrow">최초 오답 스냅샷</p>
        <h1>저장된 오답 세트</h1>
      </section>

      <section className="saved-set-overview" aria-label="저장된 오답 세트 현황">
        <span><strong>{sets.length}</strong>전체</span>
        <span><strong>{sets.length - completedCount}</strong>진행 중</span>
        <span><strong>{completedCount}</strong>복습 완료</span>
        <span><strong>{sets.filter((set) => set.isBookmarked).length}</strong>북마크</span>
      </section>

      {sets.length === 0 ? (
        <section className="empty-panel">
          <h2>저장된 오답 세트가 없습니다</h2>
          <p>일반 퀴즈 결과에서 오답 세트를 저장하면 여기에 표시됩니다.</p>
        </section>
      ) : (
        <section className="saved-set-list" aria-label="오답 세트 목록">
          {sets.map((set) => {
            const missingIds = set.originalQuestionIds.filter((id) => !questionMap.has(id));
            const availableOriginalIds = set.originalQuestionOrder.filter((id) => questionMap.has(id));
            const availableRemainingIds = set.remainingQuestionIds.filter((id) => questionMap.has(id));
            const masteredCount = set.originalQuestionIds.filter((id) => set.masteredQuestionIds.includes(id)).length;
            const progressRate = set.originalWrongCount === 0 ? 0 : (masteredCount / set.originalWrongCount) * 100;
            const isComplete = set.remainingQuestionIds.length === 0 && missingIds.length === 0;
            const isExpanded = expandedSetId === set.id;
            const order = orders[set.id] ?? 'original';
            const years = [...new Set(set.originalQuestionIds.map((id) => questionMap.get(id)?.exam.year).filter(
              (year): year is number => year != null,
            ))].sort((a, b) => b - a);
            const subjects = [...new Set(set.originalQuestionIds.map((id) => questionMap.get(id)?.question.subjectNumber).filter(
              (subject): subject is SubjectNumber => subject != null,
            ))].sort((a, b) => a - b);
            const filteredQuestions = set.originalQuestionOrder.filter((id) => {
              const found = questionMap.get(id);
              const isRemaining = set.remainingQuestionIds.includes(id);
              const isMastered = set.masteredQuestionIds.includes(id);
              if (statusFilter === 'remaining' && !isRemaining) return false;
              if (statusFilter === 'mastered' && !isMastered) return false;
              if (yearFilter !== 'all' && found?.exam.year !== yearFilter) return false;
              if (subjectFilter !== 'all' && found?.question.subjectNumber !== subjectFilter) return false;
              return true;
            });

            return (
              <article className={`saved-set-card ${set.isBookmarked ? 'is-bookmarked' : ''}`} key={set.id}>
                <div className="saved-set-header">
                  <div>
                    {editingSetId === set.id ? (
                      <div className="rename-row">
                        <label className="field">
                          <span>오답 세트 이름</span>
                          <input
                            value={editingTitle}
                            maxLength={80}
                            onChange={(event) => setEditingTitle(event.target.value)}
                          />
                        </label>
                        <button className="button primary" type="button" disabled={!editingTitle.trim()} onClick={() => commitRename(set.id)}>
                          저장
                        </button>
                        <button className="button secondary" type="button" onClick={() => setEditingSetId(null)}>취소</button>
                      </div>
                    ) : <h2>{set.title}</h2>}
                    <p>{getYearSummary(set.years)} · {set.examKeys.length}개 회차 · {getSubjectSummary(set.subjectNumbers)}</p>
                  </div>
                  <button
                    className="bookmark-button"
                    type="button"
                    aria-label={set.isBookmarked ? '오답 세트 북마크 해제' : '오답 세트 북마크 추가'}
                    aria-pressed={set.isBookmarked}
                    onClick={() => { toggleSavedWrongSetBookmark(set.id); onRefresh(); }}
                  >
                    {set.isBookmarked ? <BookmarkCheck size={21} /> : <Bookmark size={21} />}
                  </button>
                </div>

                <div className="saved-set-metrics">
                  <span>최초 오답 <strong>{set.originalWrongCount}</strong></span>
                  <span>현재 남음 <strong>{set.remainingQuestionIds.length}</strong></span>
                  <span>다시 맞힘 <strong>{masteredCount}</strong></span>
                  <span>재풀이 <strong>{set.retryCount}회</strong></span>
                </div>
                <div className="saved-set-progress">
                  <div className="progress-label"><span>복습 진행률</span><strong>{formatRate(progressRate)}</strong></div>
                  <div className="progress-track" aria-label={`복습 진행률 ${formatRate(progressRate)}`}>
                    <div className="progress-fill" style={{ width: `${Math.min(progressRate, 100)}%` }} />
                  </div>
                </div>
                <div className="saved-set-meta">
                  <span>생성 {formatDate(set.createdAt)}</span>
                  <span>최근 학습 {formatDate(set.lastRetriedAt)}</span>
                  <strong className={isComplete ? 'status-complete' : ''}>
                    {isComplete ? '복습 완료' : `진행 중 · ${set.remainingQuestionIds.length}문제 남음`}
                  </strong>
                </div>
                {missingIds.length > 0 ? (
                  <p className="missing-notice"><AlertTriangle size={17} /> 현재 출제 가능 {availableOriginalIds.length}문제 · 현재 데이터에서 찾을 수 없는 문제 {missingIds.length}개</p>
                ) : null}

                <div className="saved-set-order">
                  <label className="field">
                    <span>재풀이 순서</span>
                    <select value={order} onChange={(event) => setOrders((current) => ({
                      ...current,
                      [set.id]: event.target.value as SavedWrongSetOrder,
                    }))}>
                      <option value="original">최초 출제 순서</option>
                      <option value="exam">연도·회차·문제 번호 순</option>
                      <option value="random">무작위 순서</option>
                    </select>
                  </label>
                </div>
                <div className="saved-set-actions">
                  {!isComplete ? (
                    <button className="button primary" type="button" disabled={availableRemainingIds.length === 0} onClick={() => onStart(set.id, 'remaining', order)}>
                      <Play size={17} /> 남은 문제만 풀기
                    </button>
                  ) : null}
                  <button className={isComplete ? 'button primary' : 'button secondary'} type="button" disabled={availableOriginalIds.length === 0} onClick={() => onStart(set.id, 'all', order)}>
                    <Play size={17} /> {isComplete ? '최초 오답 전체 다시 풀기' : '전체 다시 풀기'}
                  </button>
                  <button className="button secondary" type="button" onClick={() => toggleDetails(set.id)}>
                    <List size={17} /> {isExpanded ? '문제 목록 닫기' : '문제 목록 보기'}
                  </button>
                  <button className="button secondary" type="button" onClick={() => beginRename(set)}>
                    <Pencil size={17} /> 이름 변경
                  </button>
                  <button className="button danger" type="button" onClick={() => handleDelete(set)}>
                    <Trash2 size={17} /> 삭제
                  </button>
                </div>

                {isExpanded ? (
                  <div className="saved-set-details">
                    <div className="detail-filters">
                      <label className="field"><span>상태</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                        <option value="all">전체</option><option value="remaining">남은 문제</option><option value="mastered">다시 맞힌 문제</option>
                      </select></label>
                      <label className="field"><span>연도</span><select value={yearFilter} onChange={(event) => setYearFilter(event.target.value === 'all' ? 'all' : Number(event.target.value))}>
                        <option value="all">전체</option>{years.map((year) => <option key={year} value={year}>{year}년</option>)}
                      </select></label>
                      <label className="field"><span>과목</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value === 'all' ? 'all' : Number(event.target.value) as SubjectNumber)}>
                        <option value="all">전체</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}과목 {SUBJECTS.find((item) => item.number === subject)?.name}</option>)}
                      </select></label>
                    </div>
                    <div className="saved-question-list">
                      {filteredQuestions.map((id) => {
                        const found = questionMap.get(id);
                        const status = set.remainingQuestionIds.includes(id) ? '아직 남은 문제' : set.masteredQuestionIds.includes(id) ? '다시 맞힌 문제' : '상태 미확인';
                        if (!found) return <div className="saved-question-row is-missing" key={id}><span>{id}</span><strong>현재 데이터에서 찾을 수 없음</strong></div>;
                        return (
                          <div className="saved-question-entry" key={id}>
                            <button className="saved-question-row" type="button" onClick={() => setDetailQuestionId((current) => current === id ? null : id)}>
                              <span>{found.exam.year}년 {found.exam.session}회 · {found.question.number}번 · {found.question.subject}</span>
                              <strong>{status}</strong>
                              <small>{found.question.question}</small>
                            </button>
                            {detailQuestionId === id ? (
                              <div className="saved-question-detail">
                                <h3>{found.question.question}</h3>
                                {found.question.code ? <pre className="code-block"><code>{found.question.code}</code></pre> : null}
                                <ol>{found.question.choices.map((choice, index) => <li key={choice}>{index + 1}. {choice}</li>)}</ol>
                                <p>정답: {found.question.answer}번</p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                    {filteredQuestions.length === 0 ? <p className="empty-state">조건에 맞는 문제가 없습니다.</p> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
