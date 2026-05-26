import { useQuery, useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import useAuthStore from '../../store/useAuthStore';
import './studentExamsPortal.css';

interface ExamSessionTest {
  id: number;
  name: string;
  time_limit: number;
  pass_percentage: number;
  questions_count: number;
}

interface ExamSessionGroup {
  id: number;
  name: string;
}

interface ExamSession {
  id: number;
  test_id: number;
  group_id: number;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  test?: ExamSessionTest;
  group?: ExamSessionGroup;
  my_attempt_status?: string | null;
}

interface SessionAttempt {
  id: number;
  student_id: number;
  attempt_number: number;
  status: string;
  percentage?: number | string | null;
  correct_count?: number | null;
  incorrect_count?: number | null;
  total_questions?: number | null;
  is_passed?: boolean | null;
}

const toArray = <T,>(data: unknown): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data as T[];
  if (typeof data === 'object' && 'data' in (data as object)) {
    return ((data as { data: T[] }).data) || [];
  }
  return [];
};

const formatDateTime = (date?: string, time?: string) => {
  if (!date) return '-';
  const dateOnly = date.includes('T') ? date.split('T')[0] : date;
  const parts = dateOnly.split('-');
  const d = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateOnly;
  return time ? `${d} ${time.slice(0, 5)}` : d;
};

const StudentExamsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const { data: sessionsRaw } = useQuery({
    queryKey: ['student-exam-sessions'],
    queryFn: () => API.get('/exam-sessions').then((r) => r.data),
  });

  const sessions = toArray<ExamSession>(sessionsRaw);

  // Fetch session detail for each session to get accurate attempt status.
  // GET /exam-sessions/{id} returns attempts[].status which is authoritative —
  // the list endpoint's my_attempt_status reflects the session status, not the
  // student's attempt status, causing submitted attempts to appear as in_progress.
  const detailQueries = useQueries({
    queries: sessions.map((s) => ({
      queryKey: ['exam-session-detail', s.id],
      queryFn: () => API.get(`/exam-sessions/${s.id}`).then((r) => r.data),
      staleTime: 5 * 60 * 1000,
      enabled: !!s.id,
    })),
  });

  const getMyAttempt = (idx: number): SessionAttempt | undefined => {
    const detail = detailQueries[idx]?.data as Record<string, unknown> | undefined;
    const sessionAttempts = (detail?.session as Record<string, unknown> | undefined)
      ?.attempts as SessionAttempt[] | undefined;
    const rootAttempts = detail?.attempts as SessionAttempt[] | undefined;
    const attempts = sessionAttempts ?? rootAttempts;
    console.log('DEBUG getMyAttempt', { idx, userId: user?.id, sessionAttempts, rootAttempts, found: attempts?.find((a) => a.student_id === user?.id) });
    return attempts?.find((a) => a.student_id === user?.id);
  };

  const getActualStatus = (session: ExamSession, idx: number): string | null | undefined => {
    return getMyAttempt(idx)?.status ?? session.my_attempt_status;
  };

  const isActuallyDone = (session: ExamSession, idx: number): boolean => {
    const status = getActualStatus(session, idx);
    return status === 'submitted' || status === 'timed_out';
  };

  const submittedSessions = sessions.filter((s, i) => isActuallyDone(s, i));
  const totalActive = sessions.filter((s, i) => !isActuallyDone(s, i)).length;

  return (
    <div className="sep-page container">
      {/* Stats */}
      <div className="sep-stats">
        <div className="sep-stat-card">
          <div className="sep-stat-label">{t('student.exams.totalTests')}</div>
          <div className="sep-stat-value">
            {sessions.length > 0 ? `${sessions.length}ta` : '—'}
          </div>
        </div>
        <div className="sep-stat-card">
          <div className="sep-stat-label">{t('student.exams.activeTests')}</div>
          <div className="sep-stat-value">{totalActive > 0 ? `${totalActive}ta` : '—'}</div>
        </div>
        <div className="sep-stat-card">
          <div className="sep-stat-label">{t('student.exams.submittedTests')}</div>
          <div className="sep-stat-value">
            {submittedSessions.length > 0 ? `${submittedSessions.length}ta` : '—'}
          </div>
        </div>
      </div>

      {/* Active Tests */}
      <div className="sep-section">
        <div className="sep-section-title">
          <span className="sep-info-icon">i</span>
          {t('student.exams.activeTitle')}
        </div>
        <table className="sep-table">
          <thead>
            <tr>
              <th>{t('student.exams.colTestName')}</th>
              <th>{t('student.exams.colGroup')}</th>
              <th>{t('student.exams.colQuestions')}</th>
              <th>{t('student.exams.colTimeLimit')}</th>
              <th>{t('student.exams.colPassPct')}</th>
              <th>{t('student.exams.colDateTime')}</th>
              <th>{t('student.exams.colActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length > 0 ? (
              sessions.map((s, idx) => {
                const actualStatus = getActualStatus(s, idx);
                const done = isActuallyDone(s, idx);
                return (
                  <tr key={s.id}>
                    <td>{s.test?.name || '-'}</td>
                    <td>{s.group?.name || '-'}</td>
                    <td>{s.test?.questions_count ?? '-'} {t('student.exams.questions')}</td>
                    <td>{s.test?.time_limit ?? '-'} {t('student.exams.minutes')}</td>
                    <td>{s.test?.pass_percentage != null ? `${s.test.pass_percentage}%` : '—'}</td>
                    <td>{formatDateTime(s.exam_date, s.start_time)}</td>
                    <td>
                      {done ? (
                        <button className="sep-btn sep-btn-done" disabled>
                          {t('student.exams.submitted')}
                        </button>
                      ) : actualStatus === 'in_progress' ? (
                        <button
                          className="sep-btn sep-btn-continue"
                          onClick={() => navigate(`/student-exam/${s.id}`)}
                        >
                          {t('student.exams.continueTest')}
                        </button>
                      ) : (
                        <button
                          className="sep-btn sep-btn-active"
                          onClick={() => navigate(`/student-exam/${s.id}`)}
                        >
                          {t('student.exams.startTest')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="sep-empty">
                  {t('student.exams.noTests')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Submitted results */}
      <div className="sep-section">
        <div className="sep-section-title">
          <span className="sep-info-icon">i</span>
          {t('student.exams.submittedTitle')}
        </div>
        <table className="sep-table">
          <thead>
            <tr>
              <th>{t('student.exams.colTestName')}</th>
              <th>{t('student.exams.colGroup')}</th>
              <th>{t('student.exams.colPassPct')}</th>
              <th>{t('student.exams.colPercent')}</th>
              <th>{t('student.exams.colCorrect')}</th>
              <th>{t('student.exams.colIncorrect')}</th>
              <th>{t('student.exams.colResult')}</th>
            </tr>
          </thead>
          <tbody>
            {submittedSessions.length > 0 ? (
              submittedSessions.map((s) => {
                const idx = sessions.indexOf(s);
                const myAttempt = getMyAttempt(idx);
                const pct =
                  myAttempt?.percentage != null
                    ? Number(myAttempt.percentage).toFixed(1)
                    : null;
                const total = myAttempt?.total_questions ?? s.test?.questions_count ?? null;
                const incorrect = myAttempt?.incorrect_count ?? null;
                const correct = total != null && incorrect != null ? total - incorrect : null;
                const passed = myAttempt?.is_passed;
                return (
                  <tr key={s.id}>
                    <td>{s.test?.name || '-'}</td>
                    <td>{s.group?.name || '-'}</td>
                    <td>{s.test?.pass_percentage != null ? `${s.test.pass_percentage}%` : '—'}</td>
                    <td>{pct != null ? `${pct}%` : '—'}</td>
                    <td>{correct != null ? correct : '—'}</td>
                    <td>{incorrect != null ? incorrect : '—'}</td>
                    <td>
                      {passed != null ? (
                        <span className={`sep-badge ${passed ? 'sep-badge-pass' : 'sep-badge-fail'}`}>
                          {passed ? t('student.exams.passed') : t('student.exams.failed')}
                        </span>
                      ) : (
                        <span className="sep-badge sep-badge-submitted">
                          {t('student.exams.submittedBadge')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="sep-empty">
                  {t('student.exams.noSubmitted')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentExamsPage;
