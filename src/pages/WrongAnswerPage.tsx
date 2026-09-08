import { ArrowLeft, ClipboardList, Play, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { WrongAnswerList } from '../components/WrongAnswerList';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { QuizConfig, SubjectNumber, WrongAnswerNote } from '../types/quiz';
import { SUBJECTS } from '../types/quiz';
import { questionMatchesSearch } from '../utils/quizUtils';
import { clearWrongAnswerNotes, removeWrongAnswerNote } from '../utils/storageUtils';

interface WrongAnswerPageProps {
  notes: WrongAnswerNote[];
  onStartQuiz: (config: QuizConfig) => void;
  onBack: () => void;
  onGoSavedSets: () => void;
  onRefresh: () => void;
}

type AllOrNumber = 'all' | number;

function parseAllOrNumber(value: string): AllOrNumber {
  return value === 'all' ? 'all' : Number(value);
}

export function WrongAnswerPage({ notes, onStartQuiz, onBack, onGoSavedSets, onRefresh }: WrongAnswerPageProps) {
  const [selectedYear, setSelectedYear] = useState<AllOrNumber>('all');
  const [selectedSession, setSelectedSession] = useState<AllOrNumber>('all');
  const [selectedSubject, setSelectedSubject] = useState<SubjectNumber | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [keepUntilManualDelete, setKeepUntilManualDelete] = useLocalStorage(
    'info-processing-quiz:keep-wrong-until-manual-delete',
    true,
  );

  const years = useMemo(
    () => [...new Set(notes.map((note) => note.exam.year))].sort((a, b) => b - a),
    [notes],
  );
  const sessions = useMemo(() => {
    return [
      ...new Set(
        notes
          .filter((note) => selectedYear === 'all' || note.exam.year === selectedYear)
          .map((note) => note.exam.session),
      ),
    ].sort((a, b) => b - a);
  }, [notes, selectedYear]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesYear = selectedYear === 'all' || note.exam.year === selectedYear;
      const matchesSession = selectedSession === 'all' || note.exam.session === selectedSession;
      const matchesSubject = selectedSubject ? note.question.subjectNumber === selectedSubject : true;
      const matchesSearch = questionMatchesSearch(note.question, searchTerm);

      return matchesYear && matchesSession && matchesSubject && matchesSearch;
    });
  }, [notes, searchTerm, selectedSession, selectedSubject, selectedYear]);

  const startWrongQuiz = (questionIds: string[], wrongNoteRetryMode: 'all' | 'selected' = 'selected') => {
    if (questionIds.length === 0) {
      return;
    }

    onStartQuiz({
      examId: 'wrong-note',
      source: 'wrong-note',
      count: 'all',
      shuffleQuestions,
      shuffleChoices: false,
      questionIds,
      autoRemoveWrongOnCorrect: !keepUntilManualDelete,
      wrongNoteRetryMode,
    });
  };

  const handleRemove = (questionId: string) => {
    removeWrongAnswerNote(questionId);
    onRefresh();
  };

  const handleClear = () => {
    if (!window.confirm('오답노트를 모두 비울까요?')) {
      return;
    }

    clearWrongAnswerNotes();
    onRefresh();
  };

  return (
    <main className="page-shell">
      <section className="page-heading">
        <button className="icon-text-button" type="button" onClick={onBack}>
          <ArrowLeft size={18} aria-hidden="true" />
          메인으로
        </button>
        <p className="eyebrow">저장된 오답</p>
        <h1>오답노트</h1>
        <div className="page-tabs" role="tablist" aria-label="오답 학습 메뉴">
          <button className="button primary" type="button" role="tab" aria-selected="true">현재 오답노트</button>
          <button className="button secondary" type="button" role="tab" aria-selected="false" onClick={onGoSavedSets}>저장된 오답 세트</button>
        </div>
      </section>

      <section className="selector-panel" aria-label="오답노트 필터">
        <div className="section-heading">
          <ClipboardList size={20} aria-hidden="true" />
          <h2>필터</h2>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>연도</span>
            <select value={selectedYear} onChange={(event) => setSelectedYear(parseAllOrNumber(event.target.value))}>
              <option value="all">전체</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}년
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>회차</span>
            <select
              value={selectedSession}
              onChange={(event) => setSelectedSession(parseAllOrNumber(event.target.value))}
            >
              <option value="all">전체</option>
              {sessions.map((session) => (
                <option key={session} value={session}>
                  {session}회
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>과목</span>
            <select
              value={selectedSubject ?? 'all'}
              onChange={(event) =>
                setSelectedSubject(
                  event.target.value === 'all' ? undefined : (Number(event.target.value) as SubjectNumber),
                )
              }
            >
              <option value="all">전체 과목</option>
              {SUBJECTS.map((subject) => (
                <option key={subject.number} value={subject.number}>
                  {subject.number}과목 {subject.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>검색</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="문제, 보기, 해설 검색"
            />
          </label>
        </div>
        <div className="toggle-row">
          <label className="toggle">
            <input
              type="checkbox"
              checked={shuffleQuestions}
              onChange={(event) => setShuffleQuestions(event.target.checked)}
            />
            문제 순서 섞기
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={keepUntilManualDelete}
              onChange={(event) => setKeepUntilManualDelete(event.target.checked)}
            />
            정답을 맞혀도 직접 삭제 전까지 유지
          </label>
        </div>
      </section>

      <div className="bulk-actions">
        <button
          className="button primary"
          type="button"
          disabled={filteredNotes.length === 0}
          onClick={() => startWrongQuiz(filteredNotes.map((note) => note.questionId), 'all')}
        >
          <Play size={18} aria-hidden="true" />
          전체 오답 다시 풀기
        </button>
        <button className="button danger" type="button" disabled={notes.length === 0} onClick={handleClear}>
          <Trash2 size={18} aria-hidden="true" />
          오답노트 비우기
        </button>
      </div>

      <section className="wrong-result-panel" aria-label="오답 문제">
        <div className="section-heading">
          <Search size={20} aria-hidden="true" />
          <h2>{filteredNotes.length}문제</h2>
        </div>
        <WrongAnswerList notes={filteredNotes} onRetry={startWrongQuiz} onRemove={handleRemove} />
      </section>
    </main>
  );
}
