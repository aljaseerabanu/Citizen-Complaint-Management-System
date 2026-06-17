import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintAPI } from '../services/api';
import socketService from '../services/socketService';
import ComplaintHeatmap from '../components/ComplaintHeatmap';
import '../styles/Dashboard.css';

const StaffDashboard = () => {
  const { user } = useAuth();

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    locality: ''
  });

  // Stats calculation
  const stats = {
    pending: complaints.filter(c => c.status === 'Pending').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
    highPriority: complaints.filter(c => c.priority === 'High').length
  };

  useEffect(() => {
    loadComplaints();
    
    if (user) {
      socketService.connect(user);

      socketService.onNewComplaint((newComplaint) => {
        console.log('New complaint received:', newComplaint);
        if (newComplaint.department === user.department) {
          setComplaints(prev => [newComplaint, ...prev]);
        }
      });

      socketService.onComplaintUpdated((updatedComplaint) => {
        console.log('Complaint updated:', updatedComplaint);
        setComplaints(prev =>
          prev.map(c => c._id === updatedComplaint._id ? updatedComplaint : c)
        );
      });
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [user]);

  useEffect(() => {
    loadComplaints();
  }, [filters]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await complaintAPI.getByDepartment(user.department);
      } catch (error) {
        console.warn('getByDepartment failed, fetching all complaints');
        res = await complaintAPI.getAll();
      }
      
      let data = res.data.complaints || [];

      if (user.department) {
        data = data.filter(c => c.department === user.department);
      }

      if (filters.status) {
        data = data.filter(c => c.status === filters.status);
      }

      if (filters.priority) {
        data = data.filter(c => c.priority === filters.priority);
      }

      if (filters.locality) {
        data = data.filter(c =>
          c.locality?.toLowerCase().includes(filters.locality.toLowerCase())
        );
      }

      setComplaints(data);
    } catch (err) {
      console.error('Error loading complaints:', err);
      alert('Failed to load complaints. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      console.log('Updating status:', { complaintId, newStatus });
      
      // Pass status as string - the API will wrap it properly
      const response = await complaintAPI.updateStatus(complaintId, newStatus);

      console.log('Update response:', response);

      if (response.data.success || response.data.complaint) {
        // Update local state immediately
        setComplaints(prev =>
          prev.map(c =>
            c._id === complaintId ? { ...c, status: newStatus } : c
          )
        );
        
        // Show success toast
        showToast('✅ Status updated successfully!', 'success');
      }
    } catch (err) {
      console.error('Status update error:', err);
      console.error('Error response:', err.response?.data);
      
      const errorMessage = err.response?.data?.error 
        || err.response?.data?.message 
        || 'Failed to update status. Please check your connection.';
      
      showToast(`❌ ${errorMessage}`, 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `status-update-toast ${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      font-weight: 500;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, type === 'success' ? 3000 : 4000);
  };

  const getTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const toggleAISummary = (complaintId) => {
    setComplaints(prev =>
      prev.map(c =>
        c._id === complaintId
          ? { ...c, showAI: !c.showAI }
          : c
      )
    );
  };

  if (loading && complaints.length === 0) {
    return (
      <div className="modern-dashboard-page">
        <div className="modern-header">
          <div className="container">
            <div className="header-content">
              <div>
                <h1>👨‍💼 Staff Dashboard</h1>
                <p>Welcome, <strong>{user?.name}</strong> - {user?.department} Department</p>
              </div>
              <div className="live-badge">
                <span className="pulse-dot"></span>
                Live Updates
              </div>
            </div>
          </div>
        </div>
        <div className="modern-loading">
          <div className="modern-spinner-large"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-dashboard-page">
      {/* Header */}
      <div className="modern-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>👨‍💼 Staff Dashboard</h1>
              <p>Welcome, <strong>{user?.name}</strong> - {user?.department} Department</p>
            </div>
            <div className="header-actions">
              <a 
                href="/analytics" 
                className="modern-btn modern-btn-header"
              >
                📊 Analytics
              </a>
              <div className="live-badge">
                <span className="pulse-dot"></span>
                Live Updates
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Filter Section */}
        <div className="modern-filter-card">
          <h3>🔍 Filter Complaints</h3>
          <div className="filter-grid">
            <div className="filter-item">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              >
                <option value="">All Priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Locality</label>
              <input
                type="text"
                placeholder="Search by area..."
                value={filters.locality}
                onChange={(e) => setFilters({ ...filters, locality: e.target.value })}
              />
            </div>
          </div>
          <button 
            onClick={loadComplaints}
            className="modern-btn modern-btn-primary"
            style={{ marginTop: '1rem' }}
            disabled={loading}
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="modern-stats-grid">
          <div className="modern-stat-card red">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h2>{stats.pending}</h2>
              <p>Pending</p>
            </div>
          </div>

          <div className="modern-stat-card orange">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <h2>{stats.inProgress}</h2>
              <p>In Progress</p>
            </div>
          </div>

          <div className="modern-stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h2>{stats.resolved}</h2>
              <p>Resolved</p>
            </div>
          </div>

          <div className="modern-stat-card priority">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <h2>{stats.highPriority}</h2>
              <p>High Priority</p>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="section-header-modern">
          <h2>📋 Complaints - {user?.department} Department</h2>
          <div className="modern-view-toggle">
            <button
              className={activeView === 'list' ? 'active' : ''}
              onClick={() => setActiveView('list')}
            >
              📋 List View
            </button>
            <button
              className={activeView === 'map' ? 'active' : ''}
              onClick={() => setActiveView('map')}
            >
              🗺️ Map View
            </button>
          </div>
        </div>

        {/* Content */}
        {activeView === 'map' ? (
          <div className="map-section" style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '1rem' }}>🗺️ Complaints Heatmap - {user?.department} Department</h3>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Heat intensity shows complaint density. Darker red areas have more complaints.
            </p>
            <ComplaintHeatmap complaints={complaints} />
          </div>
        ) : (
          <div className="modern-complaints-grid">
            {complaints.length === 0 ? (
              <div className="modern-empty-state">
                <div className="empty-icon">📋</div>
                <h3>No Complaints Found</h3>
                <p>There are no complaints matching your filters.</p>
              </div>
            ) : (
              complaints.map((complaint) => (
                <div key={complaint._id} className="modern-complaint-card">
                  {/* Card Header */}
                  <div className="modern-card-header">
                    <h3>{complaint.title}</h3>
                    <span className={`modern-status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                      {complaint.status}
                    </span>
                  </div>

                  {/* Priority & Time */}
                  <div className="card-meta-row">
                    <span className={`modern-priority-badge ${complaint.priority?.toLowerCase() || 'medium'}`}>
                      🔥 {complaint.priority || 'Medium'} Priority
                    </span>
                    <span className="time-badge">{getTimeAgo(complaint.createdAt)}</span>
                  </div>

                  {/* AI Summary Toggle */}
                  {complaint.aiAnalysis?.summary && (
                    <>
                      <button
                        className="ai-toggle-btn"
                        onClick={() => toggleAISummary(complaint._id)}
                      >
                        🤖 AI Summary {complaint.showAI ? '▼' : '▶'}
                      </button>

                      {complaint.showAI && (
                        <div className="ai-summary-box">
                          <p><strong>Summary:</strong> {complaint.aiAnalysis.summary}</p>
                          {complaint.aiAnalysis.suggestedAction && (
                            <p><strong>Suggested Action:</strong> {complaint.aiAnalysis.suggestedAction}</p>
                          )}
                          {complaint.aiAnalysis.estimatedResolutionTime && (
                            <p><strong>Est. Time:</strong> {complaint.aiAnalysis.estimatedResolutionTime}</p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Media */}
                  {complaint.media?.url && (
                    <div className="modern-media">
                      {complaint.media.type === 'photo' ? (
                        <img src={complaint.media.url} alt="Complaint" />
                      ) : (
                        <video src={complaint.media.url} controls />
                      )}
                    </div>
                  )}

                  {/* Description */}
                  <p className="modern-description">{complaint.description}</p>

                  {/* Location & Citizen */}
                  <div className="modern-card-footer">
                    <div className="footer-info">
                      <span>
                        <span className="footer-icon">👤</span>
                        {complaint.citizen?.name || 'Unknown'}
                      </span>
                      <span>
                        <span className="footer-icon">📍</span>
                        {complaint.locality || 'Unknown locality'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons - Proper workflow: Pending -> In Progress -> Resolved */}
                  <div className="modern-actions">
                    {complaint.status === 'Pending' && (
                      <button
                        className="modern-btn primary"
                        onClick={() => handleStatusUpdate(complaint._id, 'In Progress')}
                      >
                        ▶️ Start Working
                      </button>
                    )}
                    {complaint.status === 'In Progress' && (
                      <button
                        className="modern-btn success"
                        onClick={() => handleStatusUpdate(complaint._id, 'Resolved')}
                      >
                        ✅ Mark as Resolved
                      </button>
                    )}
                    {complaint.status === 'Resolved' && (
                      <button
                        className="modern-btn secondary"
                        onClick={() => handleStatusUpdate(complaint._id, 'Pending')}
                      >
                        🔄 Reopen
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;