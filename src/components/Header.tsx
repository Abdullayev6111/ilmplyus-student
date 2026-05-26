import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LanguageSelect from './LanguageSelect/LanguageSelect';
import adminImg from '../assets/images/admin-img.svg';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { API } from '../api/api';
import useAuthStore from '../store/useAuthStore';

type Permission = {
  id: number;
  name: string;
};

type Role = {
  id: number;
  name: string;
  permissions?: Permission[];
};

type MeResponse = {
  id: number;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  image_url?: string | null;
  role?: Role;
};

const Header = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [showLogout, setShowLogout] = useState(false);
  const logoutRef = useRef<HTMLDivElement>(null);

  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (logoutRef.current && !logoutRef.current.contains(event.target as Node)) {
        setShowLogout(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const pageTitles: Record<string, string> = {
    '/': t('header.controlPanel'),
    '/test': t('header.test'),
  };

  const setPermissions = useAuthStore((state) => state.setPermissions);
  const setUser = useAuthStore((state) => state.setUser);

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<MeResponse> => {
      const { data } = await API.get('/me');
      return data?.student ?? data;
    },
  });

  useEffect(() => {
    if (data) {
      const rolePerms = data.role?.permissions?.map((p: Permission) => p.name) ?? [];
      if (rolePerms.length) setPermissions(rolePerms);
      setUser({ id: data.id, name: data.full_name ?? '', role: data.role?.name ?? 'student' });
    }
  }, [data, setPermissions, setUser]);

  const firstName = data?.first_name ?? '';
  const lastName = data?.last_name ?? '';

  const title = pageTitles[pathname] ?? t('header.controlPanel');

  return (
    <header>
      <div className="header-left">
        <h1>{title}</h1>
        <form
          className="header-left-form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
          <input type="text" placeholder={t('registration.inputPlaceholder')} />
        </form>
      </div>

      <div className="header-right">
        <div className="header-right-buttons">
          <LanguageSelect />
          <button className="notification-btn">
            <i className="fa-solid fa-bell"></i>
          </button>
          <button className="chat-btn">
            <i className="fa-regular fa-message"></i>
          </button>
        </div>

        <div
          className={`header-right-admin ${showLogout ? 'active' : ''}`}
          onClick={() => setShowLogout(!showLogout)}
          ref={logoutRef}
        >
          <div style={{ textAlign: 'right' }}>
            <h1>
              {firstName} {lastName}
            </h1>
            <h3>{data?.role?.name ?? 'Student'}</h3>
          </div>
          <div className="header-right-admin-card">
            <img src={adminImg} alt="admin avatar" />
          </div>

          {showLogout && (
            <div className="logout-dropdown">
              <button
                className="logout-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogout(false);
                  navigate('/profile');
                }}
              >
                <i className="fa-solid fa-user"></i>
                <span>{t('header.profile')}</span>
              </button>
              <button onClick={handleLogout} className="logout-btn">
                <i className="fa-solid fa-right-from-bracket"></i>
                <span>{t('header.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
