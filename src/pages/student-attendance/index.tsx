import { useState, useMemo, useCallback, memo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { API } from '../../api/api';
import './studentAttendance.css';

interface Group {
  id: number;
  name: string;
  days?: string[];
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
}

interface StudentMe {
  id: number;
  groups?: Group[];
}

interface Attendance {
  id?: number;
  student_id: number;
  group_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'reason';
  score?: number;
  comment_uz?: string;
}

type MonthlyAttendanceResponse = Record<number, Attendance[]>;

interface GroupDetail {
  id: number;
  name: string;
  days?: string[];
}

const DAY_INDEX: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6, sunday: 0,
};

const MONTHS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentabr','Oktabr','Noyabr','Dekabr'];
const WEEKDAYS_SHORT = ['Yak','Du','Se','Cho','Pay','Jum','Sha'];

const STATUS_LABEL: Record<string, string> = {
  present: 'Keldi',
  absent: 'Kelmadi',
  late: 'Kechikdi',
  reason: 'Sababli',
};

const AttendanceDot = memo(
  ({ status, grade }: { status?: Attendance['status']; grade?: number }) => {
    let cls = 'attendance-dot dot-empty';
    if (status === 'present') cls = 'attendance-dot dot-present';
    if (status === 'absent') cls = 'attendance-dot dot-absent';
    if (status === 'late') cls = 'attendance-dot dot-late';
    if (status === 'reason') cls = 'attendance-dot dot-reason';

    return (
      <div className={cls} style={{ cursor: 'default' }}>
        {grade !== undefined && <span className="grade-value">{grade}</span>}
      </div>
    );
  },
);

const StudentAttendancePage = () => {
  const [searchParams] = useSearchParams();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(() => {
    const p = searchParams.get('groupId');
    return p ? Number(p) : null;
  });

  useEffect(() => {
    const p = searchParams.get('groupId');
    if (p) setSelectedGroupId(Number(p));
  }, [searchParams]);

  const { data: me } = useQuery<StudentMe>({
    queryKey: ['student-me'],
    queryFn: () => API.get('/student/me').then((r) => r.data?.student ?? r.data),
  });

  const { data: groupDetail } = useQuery<GroupDetail>({
    queryKey: ['group-detail', selectedGroupId],
    queryFn: () =>
      API.get(`/groups/${selectedGroupId}`).then((r) => r.data?.data ?? r.data),
    enabled: !!selectedGroupId,
  });

  const { data: attendanceData } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['student_attendance', 'monthly', selectedGroupId, currentYear, currentMonth],
    queryFn: () =>
      API.get('/student_attendance/monthly', {
        params: {
          group_id: selectedGroupId,
          year: currentYear,
          month: currentMonth + 1,
        },
      }).then((r) => r.data),
    enabled: !!selectedGroupId && !!me?.id,
  });

  const studentId = me?.id;
  const myAttendance: Attendance[] = studentId
    ? (attendanceData?.[studentId] ?? [])
    : [];

  const lessonDatesInMonth = useMemo(() => {
    if (!groupDetail?.days) return [];
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const lessonDays = groupDetail.days.map((d: string) => DAY_INDEX[d.toLowerCase()]);
    const result: number[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentYear, currentMonth, day);
      if (lessonDays.includes(date.getDay())) result.push(day);
    }
    return result;
  }, [currentYear, currentMonth, groupDetail]);

  const getWeekday = useCallback(
    (day: number) => WEEKDAYS_SHORT[new Date(currentYear, currentMonth, day).getDay()],
    [currentYear, currentMonth],
  );

  const getAttForDay = useCallback(
    (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return myAttendance.find((a) => String(a.date).startsWith(dateStr));
    },
    [myAttendance, currentYear, currentMonth],
  );

  const presentCount = myAttendance.filter((a) => a.status === 'present').length;
  const absentCount = myAttendance.filter((a) => a.status === 'absent').length;
  const lateCount = myAttendance.filter((a) => a.status === 'late').length;
  const reasonCount = myAttendance.filter((a) => a.status === 'reason').length;
  const avgScore = (() => {
    const scores = myAttendance.filter((a) => a.score != null).map((a) => a.score!);
    if (!scores.length) return null;
    return (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1);
  })();

  return (
    <div className="sa-page container">
      {/* Header */}
      <div className="sa-header">
        <div className="sa-controls">
          <div className="year-selector">
            <button className="year-btn" onClick={() => setCurrentYear((p) => p - 1)}>‹</button>
            <span className="year-display">{currentYear}</span>
            <button className="year-btn" onClick={() => setCurrentYear((p) => p + 1)}>›</button>
          </div>

          <div className="month-pills">
            {MONTHS.map((m, idx) => (
              <button
                key={m}
                className={`month-pill${currentMonth === idx ? ' active' : ''}`}
                onClick={() => setCurrentMonth(idx)}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div className="sa-legend">
          <div className="legend-item"><div className="legend-dot dot-present" />Keldi</div>
          <div className="legend-item"><div className="legend-dot dot-absent" />Kelmadi</div>
          <div className="legend-item"><div className="legend-dot dot-late" />Kechikdi</div>
          <div className="legend-item"><div className="legend-dot dot-reason" />Sababli</div>
        </div>
      </div>

      {/* Group selector */}
      <div className="sa-group-bar">
        <span className="sa-group-label">Guruh:</span>
        <div className="sa-group-pills">
          {me?.groups?.map((g) => (
            <button
              key={g.id}
              className={`sa-group-pill${selectedGroupId === g.id ? ' active' : ''}`}
              onClick={() => setSelectedGroupId(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">📚</div>
          <p>Davomatni ko'rish uchun guruhni tanlang</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="sa-stats">
            <div className="sa-stat sa-stat-present">
              <span className="sa-stat-num">{presentCount}</span>
              <span className="sa-stat-lbl">Keldi</span>
            </div>
            <div className="sa-stat sa-stat-absent">
              <span className="sa-stat-num">{absentCount}</span>
              <span className="sa-stat-lbl">Kelmadi</span>
            </div>
            <div className="sa-stat sa-stat-late">
              <span className="sa-stat-num">{lateCount}</span>
              <span className="sa-stat-lbl">Kechikdi</span>
            </div>
            <div className="sa-stat sa-stat-reason">
              <span className="sa-stat-num">{reasonCount}</span>
              <span className="sa-stat-lbl">Sababli</span>
            </div>
            {avgScore !== null && (
              <div className="sa-stat sa-stat-score">
                <span className="sa-stat-num">{avgScore}</span>
                <span className="sa-stat-lbl">O'rt. baho</span>
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="desktop-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th className="student-col-header">Sana</th>
                  {lessonDatesInMonth.map((day) => (
                    <th key={day} className="attendance-col-header">
                      <div className="weekday-header">{getWeekday(day)}</div>
                      <div className="date-header">{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="student-info-cell">
                    <div className="student-info-inner">
                      <div className="student-text">
                        <span className="student-name">{me && `${(me as any).last_name ?? ''} ${(me as any).first_name ?? ''}`}</span>
                        <span className="student-phone">{(me as any)?.phone ?? ''}</span>
                      </div>
                    </div>
                  </td>
                  {lessonDatesInMonth.map((day) => {
                    const att = getAttForDay(day);
                    return (
                      <td key={day} className="attendance-cell">
                        <AttendanceDot status={att?.status} grade={att?.score} />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sa-mobile-list">
            {lessonDatesInMonth.length === 0 ? (
              <div className="sa-empty-state">Bu oyda dars kunlari topilmadi</div>
            ) : (
              lessonDatesInMonth.map((day) => {
                const att = getAttForDay(day);
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                return (
                  <div key={day} className={`sa-day-card${att ? ` sa-day-${att.status}` : ''}`}>
                    <div className="sa-day-date">
                      <span className="sa-day-num">{day}</span>
                      <span className="sa-day-wd">{getWeekday(day)}</span>
                    </div>
                    <div className="sa-day-info">
                      <AttendanceDot status={att?.status} grade={att?.score} />
                      <span className="sa-day-status">
                        {att ? STATUS_LABEL[att.status] : '—'}
                      </span>
                    </div>
                    {att?.score != null && (
                      <div className="sa-day-score">Baho: {att.score}</div>
                    )}
                    {att?.comment_uz && (
                      <div className="sa-day-comment">{att.comment_uz}</div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAttendancePage;
