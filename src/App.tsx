import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import useAuthStore from './store/useAuthStore';
import StudentExamsPage from './pages/student-exams';
import StudentExamPage from './pages/student-exam';
import StudentCoursesPage from './pages/student-courses';
import StudentAttendancePage from './pages/student-attendance';
import ProfilePage from './pages/profile';
import LoginPage from './pages/login';

import './index.css';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

const App = () => {
  const isAuth = useAuthStore((state) => state.isAuth);

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuth ? <Navigate to="/student-exams" replace /> : <LoginPage />}
      />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/student-exams" replace />} />
          <Route path="/student-exams" element={<StudentExamsPage />} />
          <Route path="/student-exam/:sessionId" element={<StudentExamPage />} />
          <Route path="/student-courses" element={<StudentCoursesPage />} />
          <Route path="/student-attendance" element={<StudentAttendancePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/student-exams" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
