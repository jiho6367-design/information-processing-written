import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ChoiceNumber,
  LoadedExam,
  QuizConfig,
  QuizResult,
  QuizSession,
  WrongAnswerNote,
} from '../types/quiz';
import {
  calculateQuizResult,
  createQuizSession,
  isSameQuizConfig,
  refreshQuizSessionQuestions,
} from '../utils/quizUtils';
import {
  clearCurrentSession,
  recordCorrectWrongAnswerAttempt,
  removeWrongAnswerNote,
  saveCurrentSession,
  saveLastResult,
  saveStudyRecord,
  updateSavedWrongSetProgress,
  upsertWrongAnswerNote,
} from '../utils/storageUtils';

interface UseQuizOptions {
  config: QuizConfig;
  exams: LoadedExam[];
  wrongAnswerNotes: WrongAnswerNote[];
  initialSession: QuizSession | null;
  onComplete: (result: QuizResult) => void;
}

export function useQuiz({
  config,
  exams,
  wrongAnswerNotes,
  initialSession,
  onComplete,
}: UseQuizOptions) {
  const [session, setSession] = useState<QuizSession | null>(() => {
    if (initialSession && isSameQuizConfig(initialSession.config, config)) {
      return refreshQuizSessionQuestions(initialSession, exams);
    }

    return createQuizSession(config, exams, wrongAnswerNotes);
  });

  useEffect(() => {
    if (session) {
      saveCurrentSession(session);
    }
  }, [session]);

  const currentQuestion = session?.questions[session.currentIndex] ?? null;
  const currentAnswer = currentQuestion && session ? session.answers[currentQuestion.id] : undefined;
  const answeredCount = session ? Object.keys(session.answers).length : 0;
  const hasUnanswered = session ? answeredCount < session.questions.length : false;
  const isLastQuestion = session ? session.currentIndex === session.questions.length - 1 : false;

  const progressRate = useMemo(() => {
    if (!session || session.questions.length === 0) {
      return 0;
    }

    return ((session.currentIndex + 1) / session.questions.length) * 100;
  }, [session]);

  const answerCurrentQuestion = useCallback(
    (displayNumber: ChoiceNumber) => {
      if (!session || !currentQuestion || currentAnswer) {
        return;
      }

      const selectedChoice = currentQuestion.runtimeChoices.find(
        (choice) => choice.displayNumber === displayNumber,
      );

      if (!selectedChoice) {
        return;
      }

      const nextAnswer = {
        questionId: currentQuestion.id,
        selectedChoice: selectedChoice.originalNumber,
        selectedDisplayNumber: selectedChoice.displayNumber,
        isCorrect: selectedChoice.originalNumber === currentQuestion.answer,
        answeredAt: new Date().toISOString(),
      };

      if (nextAnswer.isCorrect) {
        if (config.source === 'wrong-note') {
          if (config.autoRemoveWrongOnCorrect) {
            removeWrongAnswerNote(currentQuestion.id);
          } else {
            recordCorrectWrongAnswerAttempt(currentQuestion.id);
          }
        }
      } else {
        upsertWrongAnswerNote(currentQuestion, nextAnswer.selectedChoice);
      }

      setSession({
        ...session,
        answers: {
          ...session.answers,
          [currentQuestion.id]: nextAnswer,
        },
      });
    },
    [config.autoRemoveWrongOnCorrect, config.source, currentAnswer, currentQuestion, session],
  );

  const goNext = useCallback(() => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return {
        ...currentSession,
        currentIndex: Math.min(currentSession.currentIndex + 1, currentSession.questions.length - 1),
      };
    });
  }, []);

  const goPrevious = useCallback(() => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return {
        ...currentSession,
        currentIndex: Math.max(currentSession.currentIndex - 1, 0),
      };
    });
  }, []);

  const moveToQuestion = useCallback((index: number) => {
    setSession((currentSession) => {
      if (!currentSession) {
        return currentSession;
      }

      return {
        ...currentSession,
        currentIndex: Math.min(Math.max(index, 0), currentSession.questions.length - 1),
      };
    });
  }, []);

  const finishQuiz = useCallback(() => {
    if (!session) {
      return null;
    }

    let result = calculateQuizResult(session);
    if (result.config.source === 'saved-wrong-set') {
      const savedWrongSetProgress = updateSavedWrongSetProgress(result);
      if (savedWrongSetProgress) {
        result = { ...result, savedWrongSetProgress };
      }
    }
    saveStudyRecord(result);
    saveLastResult(result);
    clearCurrentSession();
    setSession(null);
    onComplete(result);
    return result;
  }, [onComplete, session]);

  return {
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
  };
}
