import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    
    switch (user.role) {
      case 'citizen':
        return '/citizen/dashboard';
      case 'staff':
        return '/staff/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="logo-container">
            <div className="logo-icon">🏛️</div>
            <div>
              <h3>Citizen Complaint</h3>
              <span className="logo-subtitle">Management System</span>
            </div>
          </div>
        </Link>

        <div className="navbar-menu">
          <Link to="/" className="nav-link">Home</Link>
          <a href="#about" className="nav-link">About</a>
          <a href="#contact" className="nav-link">Contact</a>

          {isAuthenticated ? (
            <>
              <Link to={getDashboardLink()} className="nav-link">
                Dashboard
              </Link>
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role badge badge-info">{user.role}</span>
              </div>
              <button onClick={handleLogout} className="btn btn-danger btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;