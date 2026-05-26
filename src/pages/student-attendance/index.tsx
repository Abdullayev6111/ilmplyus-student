import { useState, useMemo, useCallback, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  first_name?: string;
  last_name?: string;
  phone?: string;
  photo_url?: string;
  balance?: number;
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
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 0,
};

const AttendanceDot = memo(
  ({ status, grade }: { status?: Attendance['status']; grade?: number }) => {
    let cls = 'attendance-dot dot-empty';
    if (status === 'present') cls = 'attendance-dot dot-present';
    if (status === 'absent')  cls = 'attendance-dot dot-absent';
    if (status === 'late')    cls = 'attendance-dot dot-late';
    if (status === 'reason')  cls = 'attendance-dot dot-reason';

    return (
      <div className={cls} style={{ cursor: 'default' }}>
        {grade !== undefined && <span className="grade-value">{grade}</span>}
      </div>
    );
  },
);

const StudentAttendancePage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  const MONTHS = t('student.attendance.months', { returnObjects: true }) as string[];
  const WEEKDAYS_SHORT = t('student.attendance.weekdays', { returnObjects: true }) as string[];

  const STATUS_LABEL: Record<string, string> = {
    present: t('student.attendance.status.present'),
    absent: t('student.attendance.status.absent'),
    late: t('student.attendance.status.late'),
    reason: t('student.attendance.status.reason'),
  };

  const selectedGroupId = searchParams.get('groupId') ? Number(searchParams.get('groupId')) : null;

  const selectGroup = (id: number) => {
    setSearchParams({ groupId: String(id) }, { replace: true });
  };

  const prevMonth = useCallback(() => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }, [currentMonth]);

  const nextMonth = useCallback(() => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }, [currentMonth]);

  const { data: me } = useQuery<StudentMe>({
    queryKey: ['student-me'],
    queryFn: () => API.get('/me').then((r) => r.data?.student ?? r.data),
  });

  const { data: groupDetail } = useQuery<GroupDetail>({
    queryKey: ['group-detail', selectedGroupId],
    queryFn: () => API.get(`/groups/${selectedGroupId}`).then((r) => r.data?.data ?? r.data),
    enabled: !!selectedGroupId,
  });

  const { data: attendanceData } = useQuery<MonthlyAttendanceResponse>({
    queryKey: ['student_attendance', 'monthly', selectedGroupId, currentYear, currentMonth],
    queryFn: () =>
      API.get('/student_attendance/monthly', {
        params: { group_id: selectedGroupId, year: currentYear, month: currentMonth + 1 },
      }).then((r) => r.data),
    enabled: !!selectedGroupId && !!me?.id,
  });

  const studentId = me?.id;
  const myAttendance = useMemo<Attendance[]>(
    () => (studentId ? (attendanceData?.[studentId] ?? []) : []),
    [studentId, attendanceData],
  );

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
    [currentYear, currentMonth, WEEKDAYS_SHORT],
  );

  const getAttForDay = useCallback(
    (day: number) => {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return myAttendance.find((a) => String(a.date).startsWith(dateStr));
    },
    [myAttendance, currentYear, currentMonth],
  );

  const presentCount = myAttendance.filter((a) => a.status === 'present').length;
  const absentCount  = myAttendance.filter((a) => a.status === 'absent').length;
  const lateCount    = myAttendance.filter((a) => a.status === 'late').length;
  const reasonCount  = myAttendance.filter((a) => a.status === 'reason').length;
  const avgScore = (() => {
    const scores = myAttendance.filter((a) => a.score != null).map((a) => a.score!);
    if (!scores.length) return null;
    return (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(1);
  })();

  const studentName  = me ? `${me.last_name ?? ''} ${me.first_name ?? ''}`.trim() : '';
  const studentPhone = me?.phone ?? '';

  const isGroupActive = useMemo(() => {
    if (!selectedGroupId || !me?.groups) return true;
    const group = me.groups.find((g) => g.id === selectedGroupId);
    if (!group?.end_date) return true;
    return new Date(group.end_date) >= new Date();
  }, [selectedGroupId, me]);

  const formatBalance = (n: number) =>
    Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const monthFirstDay = `01.${String(currentMonth + 1).padStart(2, '0')}.${currentYear}`;

  return (
    <div className="sa-page container">

      {/* ── Mobile month nav (hidden on desktop) ── */}
      <div className="sa-mobile-header">
        <div className="sa-mobile-nav">
          <button className="sa-nav-arrow" onClick={prevMonth}>‹</button>
          <span className="sa-nav-title">
            {MONTHS[currentMonth].toUpperCase()} {currentYear}
          </span>
          <button className="sa-nav-arrow" onClick={nextMonth}>›</button>
        </div>
        <div className="sa-mobile-legend">
          <span className="legend-item"><span className="legend-dot dot-present" />{t('student.attendance.legend.present')}</span>
          <span className="legend-item"><span className="legend-dot dot-absent" />{t('student.attendance.legend.absent')}</span>
          <span className="legend-item"><span className="legend-dot dot-late" />{t('student.attendance.legend.late')}</span>
          <span className="legend-item"><span className="legend-dot dot-reason" />{t('student.attendance.legend.reason')}</span>
        </div>
      </div>

      {/* ── Desktop header (hidden on mobile) ── */}
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
          <div className="legend-item"><div className="legend-dot dot-present" />{t('student.attendance.status.present')}</div>
          <div className="legend-item"><div className="legend-dot dot-absent" />{t('student.attendance.status.absent')}</div>
          <div className="legend-item"><div className="legend-dot dot-late" />{t('student.attendance.status.late')}</div>
          <div className="legend-item"><div className="legend-dot dot-reason" />{t('student.attendance.status.reason')}</div>
        </div>
      </div>

      {/* Group selector */}
      <div className="sa-group-bar">
        <span className="sa-group-label">{t('student.attendance.group')}</span>
        <div className="sa-group-pills">
          {me?.groups?.map((g) => (
            <button
              key={g.id}
              className={`sa-group-pill${selectedGroupId === g.id ? ' active' : ''}`}
              onClick={() => selectGroup(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedGroupId ? (
        <div className="sa-empty-state">
          <div className="sa-empty-icon">📚</div>
          <p>{t('student.attendance.selectGroup')}</p>
        </div>
      ) : (
        <>
          {/* ── Desktop stats (hidden on mobile) ── */}
          <div className="sa-stats">
            <div className="sa-stat sa-stat-present">
              <span className="sa-stat-num">{presentCount}</span>
              <span className="sa-stat-lbl">{t('student.attendance.status.present')}</span>
            </div>
            <div className="sa-stat sa-stat-absent">
              <span className="sa-stat-num">{absentCount}</span>
              <span className="sa-stat-lbl">{t('student.attendance.status.absent')}</span>
            </div>
            <div className="sa-stat sa-stat-late">
              <span className="sa-stat-num">{lateCount}</span>
              <span className="sa-stat-lbl">{t('student.attendance.status.late')}</span>
            </div>
            <div className="sa-stat sa-stat-reason">
              <span className="sa-stat-num">{reasonCount}</span>
              <span className="sa-stat-lbl">{t('student.attendance.status.reason')}</span>
            </div>
            {avgScore !== null && (
              <div className="sa-stat sa-stat-score">
                <span className="sa-stat-num">{avgScore}</span>
                <span className="sa-stat-lbl">{t('student.attendance.avgScore')}</span>
              </div>
            )}
          </div>

          {/* ── Desktop table (hidden on mobile) ── */}
          <div className="desktop-table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th className="student-col-header">{t('student.attendance.fish')}</th>
                  {lessonDatesInMonth.map((day) => (
                    <th key={day} className="attendance-col-header">
                      <div className="weekday-header">{getWeekday(day)}</div>
                      <div className="date-header">{day}</div>
                    </th>
                  ))}
                  <th className="sa-balance-header">{t('student.attendance.studentBalance')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="student-info-cell">
                    <div className="student-info-inner">
                      <div className="student-text">
                        <div className="student-name-row">
                          <span className="student-name">{studentName}</span>
                          <span className={`sa-status-badge ${isGroupActive ? 'sa-badge-aktiv' : 'sa-badge-noaktiv'}`}>
                            {isGroupActive ? t('student.common.active') : t('student.common.inactive')}
                          </span>
                        </div>
                        <span className="student-phone">{studentPhone}</span>
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
                  <td className="sa-balance-cell">
                    {me?.id && <div className="sa-balance-id">{t('student.common.id')}: {me.id}</div>}
                    <div className="sa-balance-date">{monthFirstDay}</div>
                    {me?.balance != null && (
                      <div className={`sa-balance-val ${me.balance >= 0 ? 'sa-balance-pos' : 'sa-balance-neg'}`}>
                        {t('student.common.balance')}: {me.balance < 0 ? '-' : ''}{formatBalance(me.balance)}
                      </div>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Mobile card (hidden on desktop) ── */}
          <div className="sa-mobile-card">
            {/* Orange student section */}
            <div className="sa-mobile-student">
              <div className="sa-mobile-avatar">
                {me?.photo_url ? (
                  <img src={me.photo_url} alt="avatar" />
                ) : (
                  <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="18" cy="14" r="7" fill="rgba(255,255,255,0.7)" />
                    <path d="M4 34c0-7.732 6.268-14 14-14s14 6.268 14 14" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                  </svg>
                )}
              </div>
              <div className="sa-mobile-sinfo">
                <div className="sa-mobile-sname">{studentName || '—'}</div>
                <div className="sa-mobile-sphone">{studentPhone}</div>
              </div>
              <div className={`sa-mobile-sbadge ${isGroupActive ? 'sa-badge-aktiv' : 'sa-badge-noaktiv'}`}>
                {isGroupActive ? t('student.common.active') : t('student.common.inactive')}
              </div>
            </div>

            {/* Horizontal attendance grid */}
            <div className="sa-mobile-grid">
              {lessonDatesInMonth.length === 0 ? (
                <div className="sa-mobile-empty">{t('student.attendance.noLessonDays')}</div>
              ) : (
                lessonDatesInMonth.map((day) => {
                  const att = getAttForDay(day);
                  return (
                    <div key={day} className="sa-grid-col">
                      <span className="sa-grid-wd">{getWeekday(day)}</span>
                      <span className="sa-grid-day">{day}</span>
                      <AttendanceDot status={att?.status} grade={att?.score} />
                    </div>
                  );
                })
              )}
            </div>

            {/* Mobile balance footer */}
            {me?.balance != null && (
              <div className="sa-mobile-balance">
                <span className="sa-mobile-balance-id">{t('student.common.id')}: {me.id} · {monthFirstDay}</span>
                <span className={`sa-mobile-balance-val ${me.balance >= 0 ? 'sa-balance-pos' : 'sa-balance-neg'}`}>
                  {t('student.common.balance')}: {me.balance < 0 ? '-' : ''}{formatBalance(me.balance)}
                </span>
              </div>
            )}
          </div>

          {/* (legacy list removed) */}
          <div className="sa-mobile-list" style={{ display: 'none' }}>
            {lessonDatesInMonth.map((day) => {
              const att = getAttForDay(day);
              return (
                <div key={day} className={`sa-day-card${att ? ` sa-day-${att.status}` : ''}`}>
                  <div className="sa-day-date">
                    <span className="sa-day-num">{day}</span>
                    <span className="sa-day-wd">{getWeekday(day)}</span>
                  </div>
                  <div className="sa-day-info">
                    <AttendanceDot status={att?.status} grade={att?.score} />
                    <span className="sa-day-status">{att ? STATUS_LABEL[att.status] : '—'}</span>
                  </div>
                  {att?.score != null && <div className="sa-day-score">Baho: {att.score}</div>}
                  {att?.comment_uz && <div className="sa-day-comment">{att.comment_uz}</div>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentAttendancePage;
