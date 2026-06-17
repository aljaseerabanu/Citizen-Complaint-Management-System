import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintAPI } from '../services/api';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [filters, setFilters] = useState({
    department: '',
    status: '',
    priority: '',
    area: ''
  });

  // Color schemes
  const DEPARTMENT_COLORS = {
    'Road': '#3b82f6',
    'Water': '#06b6d4',
    'Electricity': '#f59e0b',
    'Sanitation': '#10b981'
  };

  const STATUS_COLORS = {
    'Pending': '#ef4444',
    'In Progress': '#f59e0b',
    'Resolved': '#10b981'
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('📊 Loading admin dashboard data...');
      
      // Fetch all complaints
      const complaintsRes = await complaintAPI.getAll();
      console.log('✅ Complaints response:', complaintsRes.data);
      
      const allComplaints = complaintsRes.data.complaints || [];
      console.log(`📋 Found ${allComplaints.length} complaints`);
      
      setComplaints(allComplaints);
      
      // Calculate analytics
      const analyticsData = calculateAnalytics(allComplaints);
      console.log('📊 Analytics calculated:', analyticsData);
      
      setAnalytics(analyticsData);
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateAnalytics = (complaintsData) => {
    // Overall stats
    const totalComplaints = complaintsData.length;
    const pending = complaintsData.filter(c => c.status === 'Pending').length;
    const inProgress = complaintsData.filter(c => c.status === 'In Progress').length;
    const resolved = complaintsData.filter(c => c.status === 'Resolved').length;
    const resolutionRate = totalComplaints > 0 ? ((resolved / totalComplaints) * 100).toFixed(1) : 0;

    // Department performance
    const departments = ['Road', 'Water', 'Electricity', 'Sanitation'];
    const departmentStats = departments.map(dept => {
      const deptComplaints = complaintsData.filter(c => c.department === dept);
      const deptResolved = deptComplaints.filter(c => c.status === 'Resolved');
      
      // Calculate average resolution time (in hours)
      let avgResolutionTime = 0;
      if (deptResolved.length > 0) {
        const totalTime = deptResolved.reduce((acc, complaint) => {
          const created = new Date(complaint.createdAt);
          const resolved = complaint.resolvedAt ? new Date(complaint.resolvedAt) : new Date(complaint.updatedAt);
          const hours = (resolved - created) / (1000 * 60 * 60);
          return acc + hours;
        }, 0);
        avgResolutionTime = (totalTime / deptResolved.length).toFixed(1);
      }

      return {
        name: dept,
        total: deptComplaints.length,
        resolved: deptResolved.length,
        pending: deptComplaints.filter(c => c.status === 'Pending').length,
        inProgress: deptComplaints.filter(c => c.status === 'In Progress').length,
        avgResolutionTime: parseFloat(avgResolutionTime),
        resolutionRate: deptComplaints.length > 0 
          ? ((deptResolved.length / deptComplaints.length) * 100).toFixed(1) 
          : 0
      };
    });

    // Area-wise distribution
    const areaMap = {};
    complaintsData.forEach(complaint => {
      const area = complaint.locality || 'Unknown';
      if (!areaMap[area]) {
        areaMap[area] = {
          name: area,
          count: 0,
          pending: 0,
          resolved: 0
        };
      }
      areaMap[area].count++;
      if (complaint.status === 'Pending') areaMap[area].pending++;
      if (complaint.status === 'Resolved') areaMap[area].resolved++;
    });

    const areaStats = Object.values(areaMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Priority distribution
    const priorityStats = [
      { 
        name: 'High', 
        value: complaintsData.filter(c => c.priority === 'High').length,
        color: '#ef4444'
      },
      { 
        name: 'Medium', 
        value: complaintsData.filter(c => c.priority === 'Medium' || !c.priority).length,
        color: '#f59e0b'
      },
      { 
        name: 'Low', 
        value: complaintsData.filter(c => c.priority === 'Low').length,
        color: '#3b82f6'
      }
    ].filter(p => p.value > 0);

    // Status distribution
    const statusStats = [
      { name: 'Pending', value: pending, color: STATUS_COLORS.Pending },
      { name: 'In Progress', value: inProgress, color: STATUS_COLORS['In Progress'] },
      { name: 'Resolved', value: resolved, color: STATUS_COLORS.Resolved }
    ].filter(s => s.value > 0);

    return {
      overall: {
        total: totalComplaints,
        pending,
        inProgress,
        resolved,
        resolutionRate
      },
      departmentStats,
      areaStats,
      priorityStats,
      statusStats
    };
  };

  const getFilteredComplaints = () => {
    return complaints.filter(complaint => {
      if (filters.department && complaint.department !== filters.department) return false;
      if (filters.status && complaint.status !== filters.status) return false;
      if (filters.priority && complaint.priority !== filters.priority) return false;
      if (filters.area && !complaint.locality?.toLowerCase().includes(filters.area.toLowerCase())) return false;
      return true;
    });
  };

  const exportData = () => {
    const data = getFilteredComplaints();
    const csv = [
      ['ID', 'Title', 'Department', 'Status', 'Priority', 'Area', 'Date'].join(','),
      ...data.map(c => [
        c._id,
        `"${c.title}"`,
        c.department,
        c.status,
        c.priority || 'Medium',
        c.locality || 'Unknown',
        new Date(c.createdAt).toLocaleDateString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="admin-dashboard-page">
        <div className="modern-header">
          <div className="container">
            <h1>👨‍💼 Admin Dashboard</h1>
            <p>System-Wide Overview & Analytics</p>
          </div>
        </div>
        <div className="modern-loading">
          <div className="modern-spinner-large"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard-page">
        <div className="modern-header">
          <div className="container">
            <h1>👨‍💼 Admin Dashboard</h1>
            <p>System-Wide Overview & Analytics</p>
          </div>
        </div>
        <div className="modern-error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to Load Dashboard</h3>
          <p>{error}</p>
          <button className="modern-btn modern-btn-primary" onClick={loadDashboardData}>
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.overall) {
    return (
      <div className="admin-dashboard-page">
        <div className="modern-header">
          <div className="container">
            <h1>👨‍💼 Admin Dashboard</h1>
            <p>System-Wide Overview & Analytics</p>
          </div>
        </div>
        <div className="modern-empty-state">
          <div className="empty-icon">📭</div>
          <h3>No Data Available</h3>
          <p>There are no complaints in the system yet.</p>
          <button className="modern-btn modern-btn-primary" onClick={loadDashboardData}>
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  const filteredComplaints = getFilteredComplaints();

  return (
    <div className="admin-dashboard-page">
      {/* Header */}
      <div className="modern-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>👨‍💼 Admin Dashboard</h1>
              <p>Welcome, <strong>{user?.name}</strong> - System Administrator</p>
            </div>
            <div className="header-actions">
              <button className="modern-btn modern-btn-header" onClick={exportData}>
                📥 Export Data
              </button>
              <button className="modern-btn modern-btn-header" onClick={loadDashboardData}>
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container admin-container">
        {/* Overall Statistics */}
        <div className="admin-stats-grid">
          <div className="admin-stat-card blue">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <h2>{analytics.overall.total}</h2>
              <p>Total Complaints</p>
            </div>
          </div>

          <div className="admin-stat-card red">
            <div className="stat-icon">⏰</div>
            <div className="stat-details">
              <h2>{analytics.overall.pending}</h2>
              <p>Pending</p>
            </div>
          </div>

          <div className="admin-stat-card orange">
            <div className="stat-icon">⚙️</div>
            <div className="stat-details">
              <h2>{analytics.overall.inProgress}</h2>
              <p>In Progress</p>
            </div>
          </div>

          <div className="admin-stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <h2>{analytics.overall.resolved}</h2>
              <p>Resolved</p>
            </div>
          </div>

          <div className="admin-stat-card purple">
            <div className="stat-icon">📈</div>
            <div className="stat-details">
              <h2>{analytics.overall.resolutionRate}%</h2>
              <p>Resolution Rate</p>
            </div>
          </div>
        </div>

        {/* Department Performance Chart */}
        {analytics.departmentStats.length > 0 && (
          <div className="chart-section">
            <div className="chart-header">
              <h2>📊 Department Performance Analysis</h2>
              <p>Average resolution time and efficiency metrics</p>
            </div>

            <div className="charts-grid">
              {/* Complaints by Department */}
              <div className="chart-card large">
                <h3>Complaints by Department</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.departmentStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="pending" stackId="a" fill="#ef4444" name="Pending" />
                    <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                    <Bar dataKey="resolved" stackId="a" fill="#10b981" name="Resolved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              {analytics.statusStats.length > 0 && (
                <div className="chart-card">
                  <h3>Overall Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analytics.statusStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {analytics.statusStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Department Performance Table */}
        {analytics.departmentStats.length > 0 && (
          <div className="performance-table-section">
            <div className="chart-header">
              <h2>🏢 Department Efficiency Metrics</h2>
              <p>Detailed performance breakdown</p>
            </div>

            <div className="performance-table">
              <table>
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Total</th>
                    <th>Pending</th>
                    <th>In Progress</th>
                    <th>Resolved</th>
                    <th>Avg. Time</th>
                    <th>Resolution Rate</th>
                    <th>Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.departmentStats.map((dept) => (
                    <tr key={dept.name}>
                      <td className="dept-name">
                        <span className="dept-badge" style={{ background: DEPARTMENT_COLORS[dept.name] }}>
                          {dept.name}
                        </span>
                      </td>
                      <td><strong>{dept.total}</strong></td>
                      <td><span className="status-badge pending">{dept.pending}</span></td>
                      <td><span className="status-badge in-progress">{dept.inProgress}</span></td>
                      <td><span className="status-badge resolved">{dept.resolved}</span></td>
                      <td>{dept.avgResolutionTime}h</td>
                      <td>{dept.resolutionRate}%</td>
                      <td>
                        {dept.resolutionRate >= 70 ? (
                          <span className="performance-badge excellent">Excellent</span>
                        ) : dept.resolutionRate >= 50 ? (
                          <span className="performance-badge good">Good</span>
                        ) : dept.resolutionRate >= 30 ? (
                          <span className="performance-badge moderate">Moderate</span>
                        ) : (
                          <span className="performance-badge poor">Needs Attention</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Complaints List */}
        <div className="complaints-section">
          <div className="chart-header">
            <h2>📋 All Complaints Monitor</h2>
            <p>Filter and view complaints across all departments</p>
          </div>

          {/* Filters */}
          <div className="admin-filters">
            <select
              value={filters.department}
              onChange={(e) => setFilters({ ...filters, department: e.target.value })}
            >
              <option value="">All Departments</option>
              <option value="Road">Road</option>
              <option value="Water">Water</option>
              <option value="Electricity">Electricity</option>
              <option value="Sanitation">Sanitation</option>
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            <input
              type="text"
              placeholder="Search by area..."
              value={filters.area}
              onChange={(e) => setFilters({ ...filters, area: e.target.value })}
            />

            <button 
              className="filter-reset-btn"
              onClick={() => setFilters({ department: '', status: '', priority: '', area: '' })}
            >
              🔄 Reset
            </button>
          </div>

          {/* Results Count */}
          <div className="results-info">
            <p>Showing <strong>{filteredComplaints.length}</strong> of <strong>{complaints.length}</strong> complaints</p>
          </div>

          {/* Complaints Table */}
          {filteredComplaints.length > 0 ? (
            <div className="complaints-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Department</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Area</th>
                    <th>Citizen</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComplaints.slice(0, 50).map((complaint) => (
                    <tr key={complaint._id}>
                      <td className="complaint-id">#{complaint._id.slice(-6)}</td>
                      <td className="complaint-title">{complaint.title}</td>
                      <td>
                        <span className="dept-badge-small" style={{ background: DEPARTMENT_COLORS[complaint.department] }}>
                          {complaint.department}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                          {complaint.status}
                        </span>
                      </td>
                      <td>
                        <span className={`priority-badge ${(complaint.priority || 'medium').toLowerCase()}`}>
                          {complaint.priority || 'Medium'}
                        </span>
                      </td>
                      <td>{complaint.locality || 'Unknown'}</td>
                      <td>{complaint.citizen?.name || 'N/A'}</td>
                      <td>{new Date(complaint.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="modern-empty-state">
              <p>No complaints match your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;