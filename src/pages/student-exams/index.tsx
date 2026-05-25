import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { API } from '../../api/api';
import './studentExamsPortal.css';

interface ExamSessionTest {
  id: number;
  name: string;
  time_limit: number;
  pass_percentage: number;
  questions_count: number;
  course_id?: number;
  level_id?: number;
}

interface ExamSessionGroup {
  id: number;
  name: string;
  course_id?: number;
  level_id?: number;
}

interface ExamSession {
  id: number;
  test_id: number;
  group_id: number;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  min_attendance_pct?: number;
  notes?: string | null;
  check_debt?: boolean;
  test?: ExamSessionTest;
  group?: ExamSessionGroup;
  my_attempt_status?: string | null;
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
  const navigate = useNavigate();

  const { data: sessionsRaw } = useQuery({
    queryKey: ['student-exam-sessions'],
    queryFn: () => API.get('/exam-sessions').then((r) => r.data),
  });

  const sessions = toArray<ExamSession>(sessionsRaw);

  const activeSessions = sessions.filter(
    (s) => s.my_attempt_status !== 'submitted' && s.my_attempt_status !== 'timed_out',
  );
  const submittedSessions = sessions.filter(
    (s) => s.my_attempt_status === 'submitted' || s.my_attempt_status === 'timed_out',
  );

  return (
    <div className="sep-page container">
      {/* Stats */}
      <div className="sep-stats">
        <div className="sep-stat-card">
          <div className="sep-stat-label">Jami testlar</div>
          <div className="sep-stat-value">{sessions.length > 0 ? `${sessions.length}ta` : '—'}</div>
        </div>
        <div className="sep-stat-card">
          <div className="sep-stat-label">Aktiv testlar</div>
          <div className="sep-stat-value">{activeSessions.length > 0 ? `${activeSessions.length}ta` : '—'}</div>
        </div>
        <div className="sep-stat-card">
          <div className="sep-stat-label">Topshirilgan testlar</div>
          <div className="sep-stat-value">{submittedSessions.length > 0 ? `${submittedSessions.length}ta` : '—'}</div>
        </div>
      </div>

      {/* Active Tests */}
      <div className="sep-section">
        <div className="sep-section-title">
          <span className="sep-info-icon">i</span>
          AKTIV TESTLAR
        </div>
        <table className="sep-table">
          <thead>
            <tr>
              <th>TEST NOMI</th>
              <th>GURUH</th>
              <th>SAVOLLAR</th>
              <th>VAQT LIMIT</th>
              <th>SANA VA VAQT</th>
              <th>AMALLAR</th>
            </tr>
          </thead>
          <tbody>
            {activeSessions.length > 0 ? (
              activeSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.test?.name || '-'}</td>
                  <td>{s.group?.name || '-'}</td>
                  <td>{s.test?.questions_count ?? '-'} ta savol</td>
                  <td>{s.test?.time_limit ?? '-'} min</td>
                  <td>{formatDateTime(s.exam_date, s.start_time)}</td>
                  <td>
                    <button
                      className="sep-btn sep-btn-active"
                      onClick={() => navigate(`/student-exam/${s.id}`)}
                    >
                      Test topshirish
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="sep-empty">
                  Aktiv testlar mavjud emas
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Submitted Tests */}
      <div className="sep-section">
        <div className="sep-section-title">
          <span className="sep-info-icon">i</span>
          Topshirilgan testlar
        </div>
        <table className="sep-table">
          <thead>
            <tr>
              <th>TEST NOMI</th>
              <th>GURUH</th>
              <th>SAVOLLAR</th>
              <th>SANA VA VAQT</th>
              <th>HOLAT</th>
            </tr>
          </thead>
          <tbody>
            {submittedSessions.length > 0 ? (
              submittedSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.test?.name || '-'}</td>
                  <td>{s.group?.name || '-'}</td>
                  <td>{s.test?.questions_count ?? '-'} ta savol</td>
                  <td>{formatDateTime(s.exam_date, s.start_time)}</td>
                  <td>
                    <span className="sep-badge sep-badge-pass">Topshirildi</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="sep-empty">
                  Topshirilgan testlar mavjud emas
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
