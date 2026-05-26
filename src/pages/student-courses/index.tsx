import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import './studentCourses.css';

interface Group {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  is_active?: number;
  days?: string[];
  duration?: number;
  max_students?: number;
}

interface StudentMe {
  id: number;
  groups?: Group[];
}

const formatDate = (d?: string) => {
  if (!d) return '—';
  const parts = d.includes('T') ? d.split('T')[0].split('-') : d.split('-');
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : d;
};

const StudentCoursesPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const DAY_LABELS = t('student.courses.days', { returnObjects: true }) as Record<string, string>;

  const { data: me, isLoading } = useQuery<StudentMe>({
    queryKey: ['student-me'],
    queryFn: () => API.get('/me').then((r) => r.data?.student ?? r.data),
  });

  const groups = me?.groups ?? [];
  const active = groups.filter((g) => g.is_active);
  const inactive = groups.filter((g) => !g.is_active);

  if (isLoading) {
    return (
      <div className="sc-page container">
        <div className="sc-loading">{t('student.courses.loading')}</div>
      </div>
    );
  }

  return (
    <div className="sc-page container">
      <div className="sc-top-stats">
        <div className="sc-stat-card">
          <span className="sc-stat-num">{groups.length}</span>
          <span className="sc-stat-lbl">{t('student.courses.totalCourses')}</span>
        </div>
        <div className="sc-stat-card sc-stat-active">
          <span className="sc-stat-num">{active.length}</span>
          <span className="sc-stat-lbl">{t('student.courses.active')}</span>
        </div>
        <div className="sc-stat-card sc-stat-done">
          <span className="sc-stat-num">{inactive.length}</span>
          <span className="sc-stat-lbl">{t('student.courses.completed')}</span>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="sc-empty">
          <div className="sc-empty-icon">📚</div>
          <p>{t('student.courses.noCourses')}</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="sc-section">
              <div className="sc-section-title">
                <span className="sc-dot sc-dot-active" />
                {t('student.courses.activeCourses')}
              </div>
              <div className="sc-grid">
                {active.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    dayLabels={DAY_LABELS}
                    t={t}
                    onAttendance={() => navigate(`/student-attendance?groupId=${g.id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {inactive.length > 0 && (
            <div className="sc-section">
              <div className="sc-section-title">
                <span className="sc-dot sc-dot-done" />
                {t('student.courses.completedCourses')}
              </div>
              <div className="sc-grid">
                {inactive.map((g) => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    dayLabels={DAY_LABELS}
                    t={t}
                    onAttendance={() => navigate(`/student-attendance?groupId=${g.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const GroupCard = ({
  group,
  dayLabels,
  t,
  onAttendance,
}: {
  group: Group;
  dayLabels: Record<string, string>;
  t: (key: string) => string;
  onAttendance: () => void;
}) => (
  <div className={`sc-card${!group.is_active ? ' sc-card-done' : ''}`}>
    <div className="sc-card-header">
      <span className="sc-card-name">{group.name}</span>
      <span className={`sc-card-badge${group.is_active ? ' badge-active' : ' badge-done'}`}>
        {group.is_active ? t('student.courses.active') : t('student.courses.completed')}
      </span>
    </div>

    <div className="sc-card-grid">
      <div className="sc-card-item">
        <span className="sc-card-item-icon">📅</span>
        <div>
          <span className="sc-card-item-lbl">{t('student.courses.startDate')}</span>
          <span className="sc-card-item-val">{formatDate(group.start_date)}</span>
        </div>
      </div>
      <div className="sc-card-item">
        <span className="sc-card-item-icon">🏁</span>
        <div>
          <span className="sc-card-item-lbl">{t('student.courses.endDate')}</span>
          <span className="sc-card-item-val">{formatDate(group.end_date)}</span>
        </div>
      </div>
      <div className="sc-card-item">
        <span className="sc-card-item-icon">🕐</span>
        <div>
          <span className="sc-card-item-lbl">{t('student.courses.lessonTime')}</span>
          <span className="sc-card-item-val">
            {group.start_time && group.end_time
              ? `${group.start_time.slice(0, 5)} – ${group.end_time.slice(0, 5)}`
              : '—'}
          </span>
        </div>
      </div>
      <div className="sc-card-item">
        <span className="sc-card-item-icon">📆</span>
        <div>
          <span className="sc-card-item-lbl">{t('student.courses.lessonDays')}</span>
          <span className="sc-card-item-val">
            {group.days?.map((d) => dayLabels[d.toLowerCase()] ?? d).join(', ') || '—'}
          </span>
        </div>
      </div>
    </div>

    <button className="sc-attend-btn" onClick={onAttendance}>
      {t('student.courses.viewAttendance')}
    </button>
  </div>
);

export default StudentCoursesPage;
