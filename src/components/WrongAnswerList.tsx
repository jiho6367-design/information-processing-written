import { Play, Trash2 } from 'lucide-react';
import type { WrongAnswerNote } from '../types/quiz';
import { getExamLabel } from '../utils/quizUtils';

interface WrongAnswerListProps {
  notes: WrongAnswerNote[];
  onRetry: (questionIds: string[]) => void;
  onRemove: (questionId: string) => void;
}

export function WrongAnswerList({ notes, onRetry, onRemove }: WrongAnswerListProps) {
  if (notes.length === 0) {
    return <p className="empty-state">조건에 맞는 오답 문제가 없습니다.</p>;
  }

  return (
    <div className="wrong-list">
      {notes.map((note) => (
        <article className="wrong-item" key={note.questionId}>
          <div className="wrong-item-main">
            <div className="question-meta">
              <span>{getExamLabel(note.exam)}</span>
              <span>{note.question.subject}</span>
              <span>{note.question.number}번</span>
            </div>
            <h3>{note.question.question}</h3>
            <p>
              최근 선택: {note.selectedChoice}번 · 정답: {note.question.answer}번 · 누적 오답{' '}
              {note.wrongCount}회
            </p>
          </div>
          <div className="item-actions">
            <button className="button secondary" type="button" onClick={() => onRetry([note.questionId])}>
              <Play size={16} aria-hidden="true" />
              다시 풀기
            </button>
            <button className="button danger" type="button" onClick={() => onRemove(note.questionId)}>
              <Trash2 size={16} aria-hidden="true" />
              제거
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
