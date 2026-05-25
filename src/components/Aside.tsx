interface Props {
  collapsed: boolean;
  onOpen: () => void;
  onClose: () => void;
}

import asideLogo from "../assets/images/o'quv-markaz.svg";
import mainLogo from "../assets/images/logo-min.svg";
import testsIcon from "../assets/images/list-check-solid-full.svg";
import profileIcon from "../assets/images/profile-icon.svg";
import coursesIcon from "../assets/images/courses-icon.svg";
import attendanceIcon from "../assets/images/user-clock-solid-full.svg";
import { NavLink } from "react-router-dom";

const menu = [
  {
    label: "Mening testlarim",
    icon: testsIcon,
    path: "/student-exams",
  },
  {
    label: "Kurslarim",
    icon: coursesIcon,
    path: "/student-courses",
  },
  {
    label: "Davomatim",
    icon: attendanceIcon,
    path: "/student-attendance",
  },
  {
    label: "Profil",
    icon: profileIcon,
    path: "/profile",
  },
];

const Aside = ({ collapsed, onOpen, onClose }: Props) => {
  return (
    <aside
      className={collapsed ? "aside collapsed" : "aside"}
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <div className="aside-top">
        <img
          src={collapsed ? mainLogo : asideLogo}
          alt="logo"
          className={collapsed ? "collapsed-logo" : "aside-logo"}
        />
      </div>

      <div className="aside-content">
        <nav className="sidebar">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
            >
              <span className="sidebar-icon">
                <img src={item.icon} alt={item.label} />
              </span>
              <span className={`sidebar-label ${collapsed ? "hidden" : ""}`}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Aside;
