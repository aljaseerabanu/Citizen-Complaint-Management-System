import { Link } from 'react-router-dom';
import '../styles/Home.css';

const Home = () => {
  const departments = [
    {
      name: 'Road Department',
      staff: [
        { name: 'Rajesh Kumar', contact: '+91 98765 43210', email: 'rajesh.road@gov.in' },
        { name: 'Priya Sharma', contact: '+91 98765 43211', email: 'priya.road@gov.in' }
      ],
      icon: '🛣️'
    },
    {
      name: 'Water Department',
      staff: [
        { name: 'Amit Singh', contact: '+91 98765 43212', email: 'amit.water@gov.in' },
        { name: 'Neha Patel', contact: '+91 98765 43213', email: 'neha.water@gov.in' }
      ],
      icon: '💧'
    },
    {
      name: 'Electricity Department',
      staff: [
        { name: 'Suresh Reddy', contact: '+91 98765 43214', email: 'suresh.electric@gov.in' },
        { name: 'Kavita Rao', contact: '+91 98765 43215', email: 'kavita.electric@gov.in' }
      ],
      icon: '⚡'
    },
    {
      name: 'Sanitation Department',
      staff: [
        { name: 'Ravi Verma', contact: '+91 98765 43216', email: 'ravi.sanitation@gov.in' },
        { name: 'Anjali Gupta', contact: '+91 98765 43217', email: 'anjali.sanitation@gov.in' }
      ],
      icon: '🧹'
    }
  ];

  const steps = [
    { step: 1, title: 'Register & Login', desc: 'Create your citizen account', icon: '👤' },
    { step: 2, title: 'Capture Media', desc: 'Take photo/video with GPS', icon: '📸' },
    { step: 3, title: 'Auto-Route', desc: 'AI assigns to department', icon: '🤖' },
    { step: 4, title: 'Resolution', desc: 'Staff resolves complaint', icon: '✅' }
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-content fade-in">
            <h1 className="hero-title">
              Citizen Complaint Management System
            </h1>
            <p className="hero-subtitle">
              Report civic issues instantly with live camera capture and GPS tracking.
              Your voice matters, and we're here to help make your city better.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary btn-lg">
                Get Started
              </Link>
              <a href="#about" className="btn btn-outline btn-lg">
                Learn More
              </a>
            </div>
          </div>
          <div className="hero-image fade-in">
            <div className="floating-card">
              <div className="card-icon">🏛️</div>
              <h3>Smart AI-Powered</h3>
              <p>Automatic department routing</p>
            </div>
            <div className="floating-card delay-1">
              <div className="card-icon">🗺️</div>
              <h3>GPS Tracking</h3>
              <p>Precise location mapping</p>
            </div>
            <div className="floating-card delay-2">
              <div className="card-icon">📊</div>
              <h3>Real-time Analytics</h3>
              <p>Track complaint status</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="about" className="how-it-works-section">
        <div className="container">
          <h2 className="section-title">How the System Works</h2>
          <p className="section-subtitle">
            Simple, efficient, and transparent complaint resolution process
          </p>
          
          <div className="steps-container">
            {steps.map((item, index) => (
              <div key={index} className="step-card fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="step-number">{item.step}</div>
                <div className="step-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="login-buttons-section">
            <h3>Choose Your Portal</h3>
            <div className="portal-buttons">
              <Link to="/login?role=citizen" className="portal-btn citizen-btn">
                <span className="portal-icon">👤</span>
                <span className="portal-text">Citizen Login</span>
              </Link>
              <Link to="/login?role=staff" className="portal-btn staff-btn">
                <span className="portal-icon">👨‍💼</span>
                <span className="portal-text">Staff Login</span>
              </Link>
              <Link to="/login?role=admin" className="portal-btn admin-btn">
                <span className="portal-icon">👨‍💻</span>
                <span className="portal-text">Admin Login</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact/Department Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <h2 className="section-title">Department Contact Information</h2>
          <p className="section-subtitle">
            Reach out to specific departments for urgent matters
          </p>

          <div className="departments-grid">
            {departments.map((dept, index) => (
              <div key={index} className="department-card fade-in" style={{ animationDelay: `${index * 0.15}s` }}>
                <div className="dept-header">
                  <span className="dept-icon">{dept.icon}</span>
                  <h3>{dept.name}</h3>
                </div>
                <div className="staff-list">
                  {dept.staff.map((member, idx) => (
                    <div key={idx} className="staff-member">
                      <h4>{member.name}</h4>
                      <p className="staff-contact">
                        <span>📞 {member.contact}</span>
                      </p>
                      <p className="staff-email">
                        <span>✉️ {member.email}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Key Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📸</div>
              <h3>Live Camera Capture</h3>
              <p>Capture photos and videos directly from your device</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🗺️</div>
              <h3>GPS Location</h3>
              <p>Automatic location detection and mapping</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Routing</h3>
              <p>Smart department and priority assignment</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-time Tracking</h3>
              <p>Monitor complaint status and resolution progress</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your data is protected with enterprise-grade security</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Fast Resolution</h3>
              <p>Priority-based complaint handling for quick action</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>About Us</h4>
              <p>Citizen Complaint Management System - Making cities better, one complaint at a time.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <Link to="/register">Register</Link>
              <Link to="/login">Login</Link>
              <a href="#about">How It Works</a>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>📞 1800-XXX-XXXX</p>
              <p>✉️ support@complaints.gov.in</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Citizen Complaint Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;