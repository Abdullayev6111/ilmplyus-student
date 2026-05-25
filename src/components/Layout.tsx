import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Aside from './Aside';

const Layout = () => {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`layout ${collapsed ? 'collapsed' : ''}`}>
      <Aside
        collapsed={collapsed}
        onOpen={() => setCollapsed(false)}
        onClose={() => setCollapsed(true)}
      />

      <div className="layout-main">
        <Header />

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
