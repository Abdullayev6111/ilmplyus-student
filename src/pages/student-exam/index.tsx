import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API } from '@/api/api';
import useAuthStore from '@/store/useAuthStore';
import type {
  ExamAttemptData,
  StartAttemptResponse,
  ExamAnswerPayload,
  ExamSubmitResult,
  StoredAnswer,
} from '@/types/exam.types';
import './studentExam.css';

type PageView = 'loading' | 'error' | 'exam' | 'result';

const StudentExamPage = () => {
  const { t } = useTranslation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const DIFFICULTY_LABEL: Record<string, string> = {
    easy: t('student.exam.difficulty.easy'),
    medium: t('student.exam.difficulty.medium'),
    hard: t('student.exam.difficulty.hard'),
  };

  const [view, setView] = useState<PageView>('loading');
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, StoredAnswer>>(new Map());
  const [submitResult, setSubmitResult] = useState<ExamSubmitResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmittedRef = useRef(false);
  const hasStartedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startMutation = useMutation({
    mutationFn: (payload: { student_id: number }) =>
      API.post<StartAttemptResponse>(`/exam-sessions/${sessionId}/start`, payload).then(
        (r) => r.data,
      ),
    onSuccess: (data) => {
      setAttemptId(data.attempt_id);
      setRemainingSeconds(data.remaining_seconds);
    },
    onError: () => {
      setErrorMsg(t('student.exam.startError'));
      setView('error');
    },
  });

  const { data: attemptData, isLoading: attemptLoading } = useQuery<ExamAttemptData>({
    queryKey: ['exam-attempt', attemptId],
    queryFn: () => API.get<ExamAttemptData>(`/exam-attempts/${attemptId}`).then((r) => r.data),
    enabled: !!attemptId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const answerMutation = useMutation({
    mutationFn: (payload: ExamAnswerPayload) =>
      API.post(`/exam-attempts/${attemptId}/answer`, payload),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      API.post<ExamSubmitResult>(`/exam-attempts/${attemptId}/submit`).then((r) => r.data),
    onSuccess: (data) => {
      clearTimer();
      setSubmitResult(data);
      setView('result');
      // Optimistically mark this session as submitted in the cache so the
      // exams list shows the submitted state immediately on navigation back.
      queryClient.setQueryData(['student-exam-sessions'], (old: unknown) => {
        if (!old) return old;
        const update = (s: Record<string, unknown>) =>
          s.id === Number(sessionId) ? { ...s, my_attempt_status: 'submitted' } : s;
        if (Array.isArray(old)) return old.map(update);
        const obj = old as Record<string, unknown>;
        if (Array.isArray(obj.data)) {
          return { ...obj, data: (obj.data as Record<string, unknown>[]).map(update) };
        }
        return old;
      });
      // Also update the session detail cache used by SubmittedSessionRow
      queryClient.setQueryData(['exam-session-detail', Number(sessionId)], (old: unknown) => {
        if (!old) return old;
        const obj = old as Record<string, unknown>;
        const attempts = Array.isArray(obj.attempts) ? obj.attempts as Record<string, unknown>[] : [];
        const updatedAttempts = attempts.map((a) =>
          a.student_id === user?.id
            ? {
                ...a,
                status: 'submitted',
                percentage: data.percentage,
                correct_count: data.correct_count,
                total_questions: data.total_questions,
                is_passed: data.is_passed,
              }
            : a,
        );
        return { ...obj, attempts: updatedAttempts };
      });
      queryClient.invalidateQueries({ queryKey: ['student-exam-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['exam-session-detail', Number(sessionId)] });
    },
  });

  const submitMutationRef = useRef(submitMutation);
  useEffect(() => {
    submitMutationRef.current = submitMutation;
  }, [submitMutation]);

  const handleAutoSubmit = useCallback(() => {
    if (autoSubmittedRef.current) return;
    autoSubmittedRef.current = true;
    submitMutationRef.current.mutate();
  }, []);

  useEffect(() => {
    if (hasStartedRef.current) return;
    if (!user?.id || !sessionId) {
      return;
    }
    hasStartedRef.current = true;
    startMutation.mutate({ student_id: user.id });
  }, [setErrorMsg, setView, startMutation, user, sessionId]);

  const isAttemptDone =
    !!attemptData &&
    (attemptData.attempt.status === 'submitted' || attemptData.attempt.status === 'timed_out');

  const resolvedView: PageView =
    view === 'result' || view === 'error'
      ? view
      : isAttemptDone
        ? 'error'
        : !attemptLoading && !!attemptData
          ? 'exam'
          : 'loading';

  const displayErrorMsg = isAttemptDone ? t('student.exam.alreadyDone') : errorMsg;

  useEffect(() => {
    if (resolvedView !== 'exam') return;
    clearTimer();
    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return clearTimer;
  }, [resolvedView, clearTimer, handleAutoSubmit]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isAnswered = (questionId: number) => {
    const a = answers.get(questionId);
    if (!a) return false;
    if (a.selected_option_id !== undefined) return true;
    if (a.selected_option_ids && a.selected_option_ids.length > 0) return true;
    if (a.text_answer !== undefined && a.text_answer.trim() !== '') return true;
    return false;
  };

  const handleOptionSelect = (questionId: number, optionId: number, type: string) => {
    if (type === 'multiple_choice') {
      setAnswers((prev) => {
        const newMap = new Map(prev);
        const existing = prev.get(questionId)?.selected_option_ids ?? [];
        const updated = existing.includes(optionId)
          ? existing.filter((id) => id !== optionId)
          : [...existing, optionId];
        newMap.set(questionId, { selected_option_ids: updated });
        answerMutation.mutate({
          question_id: questionId,
          selected_option_ids: updated,
        });
        return newMap;
      });
    } else {
      setAnswers((prev) => {
        const newMap = new Map(prev);
        newMap.set(questionId, { selected_option_id: optionId });
        return newMap;
      });
      answerMutation.mutate({
        question_id: questionId,
        selected_option_id: optionId,
      });
    }
  };

  const handleTextChange = (questionId: number, text: string) => {
    setAnswers((prev) => {
      const newMap = new Map(prev);
      newMap.set(questionId, { text_answer: text });
      return newMap;
    });
  };

  const handleTextBlur = (questionId: number, text: string) => {
    if (text.trim()) {
      answerMutation.mutate({ question_id: questionId, text_answer: text });
    }
  };

  const handleSubmitConfirm = () => {
    setShowConfirm(false);
    submitMutation.mutate();
  };

  if (resolvedView === 'loading') {
    return (
      <div className="exam-page container">
        <div className="exam-loading">
          <div className="exam-spinner" />
          <span>{t('student.exam.loading')}</span>
        </div>
      </div>
    );
  }

  if (resolvedView === 'error') {
    return (
      <div className="exam-page container">
        <div className="exam-error-card">
          <p>{displayErrorMsg}</p>
        </div>
      </div>
    );
  }

  if (resolvedView === 'result' && submitResult) {
    return (
      <div className="exam-page container">
        <div className="exam-result-card">
          <h2 className="exam-result-title">
            {submitResult.is_passed ? t('student.exam.congrats') : t('student.exam.sorry')}
          </h2>
          <div className={`exam-result-badge ${submitResult.is_passed ? 'passed' : 'failed'}`}>
            {submitResult.status_text}
          </div>
          <div className="exam-result-stats">
            <div className="exam-result-stat">
              <span className="exam-result-label">{t('student.exam.resultScore')}</span>
              <span className="exam-result-value">
                {Number(submitResult.percentage).toFixed(1)}%
              </span>
            </div>
            <div className="exam-result-stat">
              <span className="exam-result-label">{t('student.exam.resultCorrect')}</span>
              <span className="exam-result-value">
                {submitResult.correct_count}/{submitResult.total_questions}
              </span>
            </div>
            <div className="exam-result-stat">
              <span className="exam-result-label">{t('student.exam.resultPassLimit')}</span>
              <span className="exam-result-value">{submitResult.pass_percentage}%</span>
            </div>
          </div>
          <button
            className="exam-result-back-btn"
            onClick={() => navigate('/student-exams')}
          >
            {t('student.exam.backToList')}
          </button>
        </div>
      </div>
    );
  }

  const questions = attemptData!.questions;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers.get(currentQuestion.question_id);
  const unansweredCount = questions.filter((q) => !isAnswered(q.question_id)).length;

  return (
    <div className="exam-page container">
      <div className="exam-header">
        <div className="exam-header-left">
          <span className="exam-student-name">{attemptData!.attempt.student_name}</span>
          <span className="exam-header-info">
            {t('student.exam.testPrefix')} {attemptData!.attempt.course}&nbsp;&nbsp;&nbsp;{t('student.exam.groupPrefix')}{' '}
            {attemptData!.attempt.group_name}
          </span>
        </div>
        <div className={`exam-timer${remainingSeconds <= 60 ? ' exam-timer-warning' : ''}`}>
          {formatTime(remainingSeconds)}
        </div>
      </div>

      <div className="exam-body">
        <div className="exam-nav-panel">
          <div className="exam-nav-header">{t('student.exam.navTitle')}</div>
          <div className="exam-nav-grid">
            {questions.map((q, idx) => (
              <button
                key={q.question_id}
                className={[
                  'exam-nav-btn',
                  isAnswered(q.question_id) ? 'answered' : '',
                  idx === currentIndex ? 'current' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => setCurrentIndex(idx)}
              >
                {q.order}
              </button>
            ))}
          </div>
          <div className="exam-yakunlash-wrap">
            <button
              className="exam-yakunlash-btn"
              onClick={() => setShowConfirm(true)}
              disabled={submitMutation.isPending}
            >
              {t('student.exam.finish')}
            </button>
          </div>
        </div>

        <div className="exam-question-area">
          <div className="exam-question-meta">
            {currentQuestion.order} {t('student.exam.questionMeta')}
            {currentQuestion.difficulty_level
              ? ` | ${
                  DIFFICULTY_LABEL[currentQuestion.difficulty_level] ??
                  currentQuestion.difficulty_level
                }`
              : ''}
          </div>

          <div className="exam-question-content">
            <p className="exam-question-text">{currentQuestion.question_text}</p>

            <div className="exam-options">
              {currentQuestion.question_type === 'text_answer' ? (
                <input
                  className="exam-text-input"
                  type="text"
                  placeholder={t('student.exam.answerPlaceholder')}
                  value={currentAnswer?.text_answer ?? ''}
                  onChange={(e) => handleTextChange(currentQuestion.question_id, e.target.value)}
                  onBlur={(e) => handleTextBlur(currentQuestion.question_id, e.target.value)}
                />
              ) : (
                currentQuestion.options.map((opt) => {
                  const selected =
                    currentQuestion.question_type === 'multiple_choice'
                      ? (currentAnswer?.selected_option_ids?.includes(opt.id) ?? false)
                      : currentAnswer?.selected_option_id === opt.id;
                  return (
                    <button
                      key={opt.id}
                      className={`exam-option-btn${selected ? ' selected' : ''}`}
                      onClick={() =>
                        handleOptionSelect(
                          currentQuestion.question_id,
                          opt.id,
                          currentQuestion.question_type,
                        )
                      }
                    >
                      {opt.option_text}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="exam-question-footer">
            <button
              className="exam-btn-secondary"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              {t('student.exam.prev')}
            </button>
            <button
              className="exam-btn-primary"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
            >
              {t('student.exam.next')}
            </button>
          </div>
        </div>
      </div>

      {showConfirm && (
        <div className="exam-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="exam-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="exam-modal-title">{t('student.exam.confirmTitle')}</h3>
            <p className="exam-modal-text">
              {t('student.exam.unanswered')} <strong>{unansweredCount}</strong> ta
            </p>
            <div className="exam-modal-actions">
              <button className="exam-btn-secondary" onClick={() => setShowConfirm(false)}>
                {t('student.exam.confirmCancel')}
              </button>
              <button
                className="exam-btn-primary"
                onClick={handleSubmitConfirm}
                disabled={submitMutation.isPending}
              >
                {submitMutation.isPending ? t('student.exam.submitting') : t('student.exam.confirmFinish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExamPage;
