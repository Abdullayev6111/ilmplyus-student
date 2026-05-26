import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { API } from '../../api/api';
import './studentProfile.css';

interface Branch {
  id: number;
  name_uz?: string;
  name_ru?: string;
  city?: string;
}

interface Group {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  end_time?: string;
  is_active?: number;
}

interface StudentData {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  father_name?: string;
  gender?: string | null;
  birth_date?: string;
  passport_series?: string;
  pinfl?: string;
  phone?: string;
  balance?: string | number;
  is_active?: boolean;
  is_contract_confirmed?: boolean;
  student_code?: string;
  username?: string;
  photo?: string | null;
  photo_url?: string | null;
  image?: string | null;
  image_url?: string | null;
  branch?: Branch;
  groups?: Group[];
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ru-RU');
};

const formatPhone = (phone?: string) => {
  if (!phone) return '-';
  return phone.startsWith('+') ? phone : `+${phone}`;
};

const formatBalance = (v?: string | number) => {
  if (v == null) return "0 SO'M";
  const num = typeof v === 'string' ? parseFloat(v) : v;
  return `${num.toLocaleString('ru-RU')} SO'M`;
};

const InfoRow = ({
  label,
  value,
  blue,
}: {
  label: string;
  value?: string | null;
  blue?: boolean;
}) => (
  <div className="sp-info-row">
    <span className="sp-info-key">{label}</span>
    <span className={`sp-info-val${blue ? ' sp-info-val-blue' : ''}`}>{value || '-'}</span>
  </div>
);

const ProfilePage = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const TABS = [
    t('student.profile.personalInfo'),
    t('student.profile.myCourses'),
    t('student.profile.examsTests'),
  ];

  const { data: profile } = useQuery<StudentData>({
    queryKey: ['student-profile'],
    queryFn: () => API.get('/me').then((r) => r.data?.student ?? r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) =>
      API.post(`/students/${profile?.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).catch(() =>
        API.put(`/students/${profile?.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-profile'] });
      closeCamera();
    },
  });

  const openCamera = async () => {
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraOpen(false);
      fileInputRef.current?.click();
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fd = new FormData();
        fd.append('image', blob, 'photo.jpg');
        uploadMutation.mutate(fd);
      },
      'image/jpeg',
      0.9,
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    uploadMutation.mutate(fd);
    e.target.value = '';
  };

  const photoUrl = profile?.image_url || profile?.photo_url || profile?.photo || profile?.image;

  const fullName =
    profile?.full_name ||
    [profile?.last_name, profile?.first_name, profile?.father_name].filter(Boolean).join(' ') ||
    '-';

  return (
    <div className="sp-page container">
      <div className="sp-header-card">
        <div className="sp-photo-wrap" onClick={openCamera} title={t('student.profile.changePhoto')}>
          {photoUrl ? (
            <img src={photoUrl} alt="profile" className="sp-photo-img" />
          ) : (
            <span className="sp-photo-plus">+</span>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div className="sp-info-area">
          <div className="sp-info-section-label">{t('student.profile.personalInfo')}</div>
          <div className="sp-info-grid">
            <InfoRow label={t('student.profile.fish')} value={fullName} blue />
            <InfoRow label={t('student.profile.studentCode')} value={profile?.student_code} blue />
            <InfoRow label={t('student.profile.username')} value={profile?.username} />
            <InfoRow label={t('student.profile.birthDate')} value={formatDate(profile?.birth_date)} />
            <InfoRow label={t('student.profile.phone')} value={formatPhone(profile?.phone)} />
            <InfoRow label={t('student.profile.branch')} value={profile?.branch?.name_uz} />
          </div>

          <div className="sp-badges">
            <span className="sp-badge-balance">
              {t('student.profile.balance')}&nbsp;&nbsp;{formatBalance(profile?.balance)}
            </span>
            <span className="sp-badge-status">
              {t('student.profile.status')}
              <span className="sp-badge-status-dot" />
              {profile?.is_active ? t('student.profile.active') : t('student.profile.inactive')}
            </span>
          </div>
        </div>
      </div>

      <div className="sp-tabs-bar">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`sp-tab-btn${activeTab === i ? ' active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="sp-tab-content">
        {activeTab === 0 && (
          <>
            <div className="sp-tab-section-title">{t('student.profile.personalInfo')}</div>
            <div className="sp-tab-info-grid">
              <InfoRow label={t('student.profile.fish')} value={fullName} blue />
              <InfoRow label={t('student.profile.studentCode')} value={profile?.student_code} blue />
              <InfoRow label={t('student.profile.username')} value={profile?.username} />
              <InfoRow label={t('student.profile.gender')} value={profile?.gender ?? '-'} />
              <InfoRow label={t('student.profile.birthDate')} value={formatDate(profile?.birth_date)} />
              <InfoRow label={t('student.profile.passport')} value={profile?.passport_series} />
              <InfoRow label={t('student.profile.pinfl')} value={profile?.pinfl} />
              <InfoRow label={t('student.profile.phone')} value={formatPhone(profile?.phone)} />
              <InfoRow label={t('student.profile.branch')} value={profile?.branch?.name_uz} />
              <InfoRow label={t('student.profile.city')} value={profile?.branch?.city} />
              <InfoRow
                label={t('student.profile.contractStatus')}
                value={profile?.is_contract_confirmed ? t('student.profile.confirmed') : t('student.profile.notConfirmed')}
              />
            </div>
          </>
        )}

        {activeTab === 1 && (
          <>
            <div className="sp-tab-section-title">{t('student.profile.myCourses')}</div>
            {profile?.groups && profile.groups.length > 0 ? (
              <table className="sep-table">
                <thead>
                  <tr>
                    <th>{t('student.profile.groupName')}</th>
                    <th>{t('student.profile.startDate')}</th>
                    <th>{t('student.profile.endDate')}</th>
                    <th>{t('student.profile.lessonTime')}</th>
                    <th>{t('student.profile.statusLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.groups.map((g) => (
                    <tr key={g.id}>
                      <td>{g.name}</td>
                      <td>{formatDate(g.start_date)}</td>
                      <td>{formatDate(g.end_date)}</td>
                      <td>
                        {g.start_time && g.end_time
                          ? `${g.start_time.slice(0, 5)} - ${g.end_time.slice(0, 5)}`
                          : '-'}
                      </td>
                      <td>
                        <span className={`sep-badge ${g.is_active ? 'sep-badge-pass' : ''}`}>
                          {g.is_active ? t('student.profile.active') : t('student.profile.inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="sp-tab-empty">{t('student.profile.noCourses')}</div>
            )}
          </>
        )}

        {activeTab === 2 && <div className="sp-tab-empty">{t('student.profile.inDevelopment')}</div>}
      </div>

      {cameraOpen && (
        <div className="sp-camera-overlay" onClick={closeCamera}>
          <div className="sp-camera-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sp-camera-heading">{t('student.profile.photoHeading')}</div>
            <video ref={videoRef} className="sp-camera-video" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="sp-hidden" />
            <div className="sp-camera-actions">
              <button
                className="sp-camera-snap"
                onClick={capturePhoto}
                disabled={uploadMutation.isPending}
              >
                {uploadMutation.isPending ? t('student.profile.photoLoading') : t('student.profile.photoCapture')}
              </button>
              <button className="sp-camera-cancel" onClick={closeCamera}>
                {t('student.profile.photoCancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
