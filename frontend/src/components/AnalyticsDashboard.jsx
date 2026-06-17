import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { complaintAPI } from '../services/api';
import '../styles/Analytics.css';

const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const COLORS = {
    Pending: '#f59e0b',
    'In Progress': '#3b82f6',
    Resolved: '#10b981',
    Rejected: '#ef4444'
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch complaints by department
      const response = await complaintAPI.getByDepartment(user.department);
      const complaintsData = response.data.complaints || [];
      
      setComplaints(complaintsData);
      
      // Calculate analytics
      const analyticsData = {
        total: complaintsData.length,
        pending: complaintsData.filter(c => c.status === 'Pending').length,
        inProgress: complaintsData.filter(c => c.status === 'In Progress').length,
        resolved: complaintsData.filter(c => c.status === 'Resolved').length,
        rejected: complaintsData.filter(c => c.status === 'Rejected').length,
        highPriority: complaintsData.filter(c => c.priority === 'High').length,
        mediumPriority: complaintsData.filter(c => c.priority === 'Medium').length,
        lowPriority: complaintsData.filter(c => c.priority === 'Low').length
      };
      
      setAnalytics(analyticsData);
      
      // Generate AI summary
      await generateAISummary(analyticsData, complaintsData);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async (analyticsData, complaintsData) => {
    try {
      const context = `
Analyze these complaint statistics for ${user.department} Department:
- Total: ${analyticsData.total}
- Pending: ${analyticsData.pending}
- In Progress: ${analyticsData.inProgress}
- Resolved: ${analyticsData.resolved}

Priority Distribution:
- High: ${analyticsData.highPriority}
- Medium: ${analyticsData.mediumPriority}
- Low: ${analyticsData.lowPriority}

Recent complaints:
${complaintsData.slice(0, 5).map(c => `- ${c.title} (${c.status}, ${c.priority})`).join('\n')}

Provide a brief summary and suggest 3 priority actions for the department staff.
      `;

      // Using a simple mock AI response (replace with actual Gemini API call)
      const summary = `
📊 Department Overview:
Your department has ${analyticsData.total} total complaints with ${analyticsData.pending} pending attention.

🎯 Priority Actions:
1. Address ${analyticsData.highPriority} high-priority complaints immediately
2. Review ${analyticsData.pending} pending complaints and assign resources
3. Monitor ${analyticsData.inProgress} in-progress items to ensure timely resolution

💡 Insights:
- Resolution rate: ${((analyticsData.resolved / analyticsData.total) * 100).toFixed(1)}%
- ${analyticsData.highPriority > 5 ? 'High number of critical issues - consider additional resources' : 'Priority distribution is manageable'}
      `;
      
      setAiSummary(summary);
    } catch (err) {
      console.error('Error generating AI summary:', err);
      setAiSummary('AI summary unavailable. Manually review high-priority pending complaints.');
    }
  };

  const updateComplaintStatus = async (complaintId, newStatus) => {
    try {
      await complaintAPI.updateStatus(complaintId, { status: newStatus });
      await fetchAnalytics();
      alert('Status updated successfully!');
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="flex-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="loading-spinner"></div>
            <p style={{ marginTop: '1rem', color: '#666' }}>Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="flex-center" style={{ minHeight: '100vh' }}>
          <div className="error-card">
            <AlertCircle style={{ width: 48, height: 48, color: '#ef4444', margin: '0 auto 1rem' }} />
            <p style={{ color: '#dc2626', textAlign: 'center' }}>{error}</p>
            <button onClick={fetchAnalytics} className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pieData = analytics ? [
    { name: 'Pending', value: analytics.pending, color: COLORS.Pending },
    { name: 'In Progress', value: analytics.inProgress, color: COLORS['In Progress'] },
    { name: 'Resolved', value: analytics.resolved, color: COLORS.Resolved },
  ].filter(item => item.value > 0) : [];

  const priorityData = analytics ? [
    { name: 'High', value: analytics.highPriority, color: '#dc2626' },
    { name: 'Medium', value: analytics.mediumPriority, color: '#f59e0b' },
    { name: 'Low', value: analytics.lowPriority, color: '#3b82f6' },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="analytics-page">
      <div className="modern-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>📊 Analytics Dashboard</h1>
              <p><strong>{user?.department}</strong> Department Analytics</p>
            </div>
            <a href="/staff/dashboard" className="btn btn-secondary">
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem' }}>
        {/* Stats Cards */}
        <div className="modern-stats-grid">
          <div className="analytics-stat-card">
            <div className="stat-icon" style={{ background: '#e5e7eb' }}>
              <AlertCircle size={32} color="#6b7280" />
            </div>
            <div>
              <p className="stat-label">Total</p>
              <p className="stat-value">{analytics?.total || 0}</p>
            </div>
          </div>
          
          <div className="analytics-stat-card">
            <div className="stat-icon" style={{ background: '#fef3c7' }}>
              <Clock size={32} color="#f59e0b" />
            </div>
            <div>
              <p className="stat-label">Pending</p>
              <p className="stat-value">{analytics?.pending || 0}</p>
            </div>
          </div>
          
          <div className="analytics-stat-card">
            <div className="stat-icon" style={{ background: '#dbeafe' }}>
              <TrendingUp size={32} color="#3b82f6" />
            </div>
            <div>
              <p className="stat-label">In Progress</p>
              <p className="stat-value">{analytics?.inProgress || 0}</p>
            </div>
          </div>
          
          <div className="analytics-stat-card">
            <div className="stat-icon" style={{ background: '#d1fae5' }}>
              <CheckCircle size={32} color="#10b981" />
            </div>
            <div>
              <p className="stat-label">Resolved</p>
              <p className="stat-value">{analytics?.resolved || 0}</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="charts-row">
          {/* Status Pie Chart */}
          <div className="chart-card">
            <h2>Status Distribution</h2>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', padding: '4rem 0' }}>No data available</p>
            )}
          </div>

          {/* Priority Bar Chart */}
          <div className="chart-card">
            <h2>Priority Distribution</h2>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6">
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#666', padding: '4rem 0' }}>No data available</p>
            )}
          </div>
        </div>

        {/* AI Summary */}
        <div className="ai-summary-card">
          <h2>🤖 AI-Powered Insights</h2>
          <div className="ai-summary-content">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{aiSummary || 'Generating insights...'}</pre>
          </div>
          <button 
            onClick={() => generateAISummary(analytics, complaints)}
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
          >
            🔄 Refresh AI Analysis
          </button>
        </div>

        {/* Recent Complaints Table */}
        <div className="modern-filter-card">
          <h2>📋 Recent Complaints</h2>
          <div className="table-responsive">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.slice(0, 10).map((complaint) => (
                  <tr key={complaint._id}>
                    <td>{complaint.title}</td>
                    <td>
                      <span className={`modern-status-badge ${complaint.status.toLowerCase().replace(' ', '-')}`}>
                        {complaint.status}
                      </span>
                    </td>
                    <td>
                      <span className={`modern-priority-badge ${complaint.priority?.toLowerCase() || 'medium'}`}>
                        {complaint.priority || 'Medium'}
                      </span>
                    </td>
                    <td>{complaint.locality || 'Unknown'}</td>
                    <td>
                      <select
                        value={complaint.status}
                        onChange={(e) => updateComplaintStatus(complaint._id, e.target.value)}
                        className="status-select"
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;