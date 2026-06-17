import Complaint from '../models/Complaint.js';
import User from '../models/User.js';

// @desc    Get admin dashboard analytics
// @route   GET /api/admin/analytics
// @access  Private/Admin
export const getAnalytics = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 });

    // Overall statistics
    const totalComplaints = complaints.length;
    const pending = complaints.filter(c => c.status === 'Pending').length;
    const inProgress = complaints.filter(c => c.status === 'In Progress').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;
    const rejected = complaints.filter(c => c.status === 'Rejected').length;

    // Department statistics
    const departments = ['Road', 'Water', 'Electricity', 'Sanitation'];
    const departmentStats = departments.map(dept => {
      const deptComplaints = complaints.filter(c => c.department === dept);
      const deptResolved = deptComplaints.filter(c => c.status === 'Resolved');
      
      // Calculate average resolution time
      let avgResolutionTime = 0;
      if (deptResolved.length > 0) {
        const totalTime = deptResolved.reduce((acc, complaint) => {
          const created = new Date(complaint.createdAt);
          const updated = new Date(complaint.updatedAt);
          const hours = (updated - created) / (1000 * 60 * 60);
          return acc + hours;
        }, 0);
        avgResolutionTime = totalTime / deptResolved.length;
      }

      return {
        department: dept,
        total: deptComplaints.length,
        pending: deptComplaints.filter(c => c.status === 'Pending').length,
        inProgress: deptComplaints.filter(c => c.status === 'In Progress').length,
        resolved: deptResolved.length,
        rejected: deptComplaints.filter(c => c.status === 'Rejected').length,
        avgResolutionTime: avgResolutionTime.toFixed(2),
        resolutionRate: deptComplaints.length > 0 
          ? ((deptResolved.length / deptComplaints.length) * 100).toFixed(2)
          : 0
      };
    });

    // Area-wise statistics
    const areaMap = {};
    complaints.forEach(complaint => {
      const area = complaint.locality || 'Unknown';
      if (!areaMap[area]) {
        areaMap[area] = {
          area,
          total: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0
        };
      }
      areaMap[area].total++;
      if (complaint.status === 'Pending') areaMap[area].pending++;
      if (complaint.status === 'In Progress') areaMap[area].inProgress++;
      if (complaint.status === 'Resolved') areaMap[area].resolved++;
    });

    const areaStats = Object.values(areaMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);

    // Priority distribution
    const priorityStats = {
      high: complaints.filter(c => c.priority === 'High').length,
      medium: complaints.filter(c => c.priority === 'Medium').length,
      low: complaints.filter(c => c.priority === 'Low').length
    };

    // Time-based trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentComplaints = complaints.filter(
      c => new Date(c.createdAt) >= thirtyDaysAgo
    );

    const dailyTrends = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyTrends[dateStr] = 0;
    }

    recentComplaints.forEach(complaint => {
      const dateStr = new Date(complaint.createdAt).toISOString().split('T')[0];
      if (dailyTrends[dateStr] !== undefined) {
        dailyTrends[dateStr]++;
      }
    });

    const trends = Object.entries(dailyTrends)
      .map(([date, count]) => ({ date, count }))
      .reverse();

    res.json({
      success: true,
      analytics: {
        overall: {
          total: totalComplaints,
          pending,
          inProgress,
          resolved,
          rejected,
          resolutionRate: totalComplaints > 0 
            ? ((resolved / totalComplaints) * 100).toFixed(2)
            : 0
        },
        departmentStats,
        areaStats,
        priorityStats,
        trends
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error.message
    });
  }
};

// @desc    Get all complaints with filters (Admin view)
// @route   GET /api/admin/complaints
// @access  Private/Admin
export const getAllComplaints = async (req, res) => {
  try {
    const { department, status, priority, area, startDate, endDate } = req.query;

    let query = {};

    if (department) query.department = department;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (area) query.locality = new RegExp(area, 'i');
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: complaints.length,
      complaints
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      message: error.message
    });
  }
};

// @desc    Get department performance statistics
// @route   GET /api/admin/department-stats
// @access  Private/Admin
export const getDepartmentStats = async (req, res) => {
  try {
    const departments = ['Road', 'Water', 'Electricity', 'Sanitation'];
    
    const stats = await Promise.all(
      departments.map(async (dept) => {
        const complaints = await Complaint.find({ department: dept });
        
        const resolved = complaints.filter(c => c.status === 'Resolved');
        const pending = complaints.filter(c => c.status === 'Pending');
        const inProgress = complaints.filter(c => c.status === 'In Progress');
        
        // Calculate average response time (time to first status change)
        let avgResponseTime = 0;
        const respondedComplaints = complaints.filter(c => c.status !== 'Pending');
        
        if (respondedComplaints.length > 0) {
          const totalTime = respondedComplaints.reduce((acc, c) => {
            const created = new Date(c.createdAt);
            const updated = new Date(c.updatedAt);
            return acc + (updated - created);
          }, 0);
          avgResponseTime = totalTime / respondedComplaints.length / (1000 * 60 * 60); // in hours
        }

        return {
          department: dept,
          total: complaints.length,
          pending: pending.length,
          inProgress: inProgress.length,
          resolved: resolved.length,
          avgResponseTime: avgResponseTime.toFixed(2),
          resolutionRate: complaints.length > 0 
            ? ((resolved.length / complaints.length) * 100).toFixed(2)
            : 0
        };
      })
    );

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch department statistics',
      message: error.message
    });
  }
};

// @desc    Get area-wise statistics
// @route   GET /api/admin/area-stats
// @access  Private/Admin
export const getAreaStats = async (req, res) => {
  try {
    const complaints = await Complaint.find();

    const areaMap = {};
    
    complaints.forEach(complaint => {
      const area = complaint.locality || 'Unknown';
      
      if (!areaMap[area]) {
        areaMap[area] = {
          area,
          total: 0,
          pending: 0,
          inProgress: 0,
          resolved: 0,
          departments: {}
        };
      }

      areaMap[area].total++;
      
      if (complaint.status === 'Pending') areaMap[area].pending++;
      if (complaint.status === 'In Progress') areaMap[area].inProgress++;
      if (complaint.status === 'Resolved') areaMap[area].resolved++;

      // Department breakdown per area
      if (!areaMap[area].departments[complaint.department]) {
        areaMap[area].departments[complaint.department] = 0;
      }
      areaMap[area].departments[complaint.department]++;
    });

    const areaStats = Object.values(areaMap)
      .sort((a, b) => b.total - a.total);

    res.json({
      success: true,
      areaStats
    });
  } catch (error) {
    console.error('Error fetching area stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch area statistics',
      message: error.message
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/admin/user-stats
// @access  Private/Admin
export const getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const citizens = await User.countDocuments({ role: 'citizen' });
    const staff = await User.countDocuments({ role: 'staff' });
    const admins = await User.countDocuments({ role: 'admin' });

    // Most active citizens
    const complaints = await Complaint.find().populate('citizen', 'name email');
    
    const citizenActivity = {};
    complaints.forEach(complaint => {
      if (complaint.citizen) {
        const citizenId = complaint.citizen._id.toString();
        if (!citizenActivity[citizenId]) {
          citizenActivity[citizenId] = {
            citizen: complaint.citizen,
            complaintCount: 0
          };
        }
        citizenActivity[citizenId].complaintCount++;
      }
    });

    const topCitizens = Object.values(citizenActivity)
      .sort((a, b) => b.complaintCount - a.complaintCount)
      .slice(0, 10);

    res.json({
      success: true,
      userStats: {
        total: totalUsers,
        citizens,
        staff,
        admins,
        topCitizens
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics',
      message: error.message
    });
  }
};