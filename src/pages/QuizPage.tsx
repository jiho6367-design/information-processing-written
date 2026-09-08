import { ArrowLeft, ArrowRight, Home, ListChecks } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { QuestionCard } from '../components/QuestionCard';
import type {
  ChoiceNumber,
  LoadedExam,
  QuizConfig,
  QuizResult,
  QuizSession,
  WrongAnswerNote,
} from '../types/quiz';
import { useQuiz } from '../hooks/useQuiz';

interface QuizPageProps {
  config: QuizConfig;
  exams: LoadedExam[];
  wrongAnswerNotes: WrongAnswerNote[];
  initialSession: QuizSession | null;
  onComplete: (result: QuizResult) => void;
  onExit: () => void;
}

const SHORTCUT_CHOICES: ChoiceNumber[] = [1, 2, 3, 4];

export function QuizPage({
  config,
  exams,
  wrongAnswerNotes,
  initialSession,
  onComplete,
  onExit,
}: QuizPageProps) {
  const {
    session,
    currentQuestion,
    currentAnswer,
    answeredCount,
    hasUnanswered,
    isLastQuestion,
    progressRate,
    answerCurrentQuestion,
    goNext,
    goPrevious,
    moveToQuestion,
    finishQuiz,
  } = useQuiz({ config, exams, wrongAnswerNotes, initialSession, onComplete });

  const unansweredQuestionNumbers = session?.questions.flatMap((question, index) => (
    session.answers[question.id] ? [] : [index + 1]
  )) ?? [];
  const unansweredQuestionSummary = unansweredQuestionNumbers.map((number) => `${number}번`).join(', ');

  const handleFinish = useCallback(() => {
    if (hasUnanswered && !window.confirm(
      `미응답 문제: ${unansweredQuestionSummary}\n\n결과를 확인할까요?`,
    )) {
      return;
    }

    finishQuiz();
  }, [finishQuiz, hasUnanswered, unansweredQuestionSummary]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!session) {
        return;
      }

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [session]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!session) {
        return;
      }

      if (SHORTCUT_CHOICES.includes(Number(event.key) as ChoiceNumber)) {
        event.preventDefault();
        answerCurrentQuestion(Number(event.key) as ChoiceNumber);
      }

      if (event.key === 'Enter' && currentAnswer) {
        event.preventDefault();

        if (isLastQuestion) {
          handleFinish();
        } else {
          goNext();
        }
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answerCurrentQuestion, currentAnswer, goNext, goPrevious, handleFinish, isLastQuestion, session]);

  if (!session || !currentQuestion) {
    return (
      <main className="page-shell">
        <section className="empty-panel">
          <h1>풀 수 있는 문제가 없습니다</h1>
          <p>선택한 조건에 맞는 문제가 없거나 문제 데이터 형식이 올바르지 않습니다.</p>
          <button className="button primary" type="button" onClick={onExit}>
            <Home size={18} aria-hidden="true" />
            메인으로
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell quiz-shell">
      <div className="quiz-topbar">
        <button className="icon-text-button" type="button" onClick={onExit}>
          <Home size={18} aria-hidden="true" />
          메인
        </button>
        <div className="quiz-status">
          <ListChecks size={18} aria-hidden="true" />
          <span>
            답한 문제 {answeredCount} / {session.questions.length}
          </span>
        </div>
      </div>

      <QuestionCard
        question={currentQuestion}
        answer={currentAnswer}
        currentIndex={session.currentIndex}
        total={session.questions.length}
        progressRate={progressRate}
        onSelect={answerCurrentQuestion}
      />

      <div className="question-nav" aria-label="문제 이동">
        {session.questions.map((question, index) => (
          <button
            key={question.id}
            className={`question-dot ${index === session.currentIndex ? 'is-current' : ''} ${
              session.answers[question.id] ? 'is-answered' : 'is-unanswered'
            }`}
            type="button"
            onClick={() => moveToQuestion(index)}
            aria-label={`${index + 1}번 문제로 이동 (${session.answers[question.id] ? '응답' : '미응답'})`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      <div className="quiz-actions">
        <button className="button secondary" type="button" onClick={goPrevious} disabled={session.currentIndex === 0}>
          <ArrowLeft size={18} aria-hidden="true" />
          이전 문제
        </button>
        {isLastQuestion ? (
          <button className="button primary" type="button" onClick={handleFinish}>
            결과 확인
          </button>
        ) : (
          <button className="button primary" type="button" onClick={goNext}>
            다음 문제
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </main>
  );
}
