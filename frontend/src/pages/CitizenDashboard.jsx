import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CameraCapture from '../components/CameraCapture';
import { complaintAPI, geocodeAPI } from '../services/api';
import '../styles/Dashboard.css';

// Gemini AI Service
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

const analyzeWithGemini = async (title, description) => {
  try {
    const prompt = `
You are an AI assistant for a Citizen Complaint Management System. Analyze the following complaint and provide a JSON response.

Complaint Title: ${title}
Complaint Description: ${description}

Please analyze this complaint and return ONLY a valid JSON object with the following structure (no markdown, no explanation):
{
  "department": "one of: Road, Water, Electricity, Sanitation",
  "priority": "one of: High, Medium, Low",
  "category": "specific issue category",
  "summary": "brief 2-sentence summary",
  "suggestedAction": "recommended action for staff",
  "estimatedResolutionTime": "estimated time like '2-3 days'"
}

Classification Rules:
- Road: potholes, road damage, traffic signals, street lights, road construction
- Water: water supply, leakage, drainage, sewage, pipe burst
- Electricity: power outage, street lights, electrical hazards, transformer issues
- Sanitation: garbage collection, waste management, cleanliness, public toilets

Priority Rules:
- High: Safety hazards, major infrastructure damage, affecting many people
- Medium: Significant issues affecting community but not immediate danger
- Low: Minor issues, cosmetic problems, routine maintenance

Return ONLY the JSON object, nothing else.
`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates[0]?.content?.parts[0]?.text;
    
    if (!text) {
      throw new Error('No response from Gemini AI');
    }

    let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
    const analysis = JSON.parse(jsonText);

    return {
      success: true,
      data: {
        department: analysis.department || 'Road',
        priority: analysis.priority || 'Medium',
        category: analysis.category || 'General',
        summary: analysis.summary || description.substring(0, 100),
        suggestedAction: analysis.suggestedAction || 'Review and assess the complaint',
        estimatedResolutionTime: analysis.estimatedResolutionTime || '3-5 days'
      }
    };
  } catch (error) {
    console.error('Gemini AI analysis error:', error);
    
    const text = `${title} ${description}`.toLowerCase();
    let department = 'Road';
    if (text.includes('water') || text.includes('pipe') || text.includes('drainage')) {
      department = 'Water';
    } else if (text.includes('electricity') || text.includes('power') || text.includes('light')) {
      department = 'Electricity';
    } else if (text.includes('garbage') || text.includes('waste') || text.includes('clean')) {
      department = 'Sanitation';
    }

    let priority = 'Medium';
    if (text.includes('urgent') || text.includes('emergency') || text.includes('danger')) {
      priority = 'High';
    } else if (text.includes('minor') || text.includes('small')) {
      priority = 'Low';
    }

    return {
      success: false,
      data: {
        department,
        priority,
        category: 'General Issue',
        summary: description.substring(0, 100),
        suggestedAction: `Inspect the ${department.toLowerCase()} issue and take appropriate action`,
        estimatedResolutionTime: priority === 'High' ? '1-2 days' : '3-5 days'
      }
    };
  }
};

const CitizenDashboard = () => {
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('new');
  const [showCamera, setShowCamera] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    media: null,
    location: null,
    address: '',
    locality: '',
    department: '',
    priority: '',
    aiSummary: ''
  });

  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (activeTab === 'my-complaints') {
      loadMyComplaints();
    }
  }, [activeTab]);

  const loadMyComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintAPI.getMine();
      setComplaints(response.data.complaints || []);
    } catch (error) {
      console.error('Error loading complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCameraCapture = async (captureData) => {
    const { media, location } = captureData;
    
    setFormData(prev => ({
      ...prev,
      media: media,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      }
    }));

    setShowCamera(false);

    // Use OpenStreetMap Nominatim for reverse geocoding
    await reverseGeocode(location.latitude, location.longitude);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    
    if (!isImage && !isVideo) {
      alert('Please upload an image or video file');
      return;
    }

    // Create blob URL
    const url = URL.createObjectURL(file);
    
    setFormData(prev => ({
      ...prev,
      media: {
        url,
        blob: file,
        type: isImage ? 'photo' : 'video'
      }
    }));

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          
          setFormData(prev => ({
            ...prev,
            location: { latitude, longitude, accuracy }
          }));

          // Reverse geocode
          await reverseGeocode(latitude, longitude);
        },
        (error) => {
          console.error('Location error:', error);
          // Set default location if permission denied
          setFormData(prev => ({
            ...prev,
            location: { latitude: 0, longitude: 0, accuracy: 0 },
            address: 'Location not available',
            locality: 'Unknown'
          }));
        }
      );
    }
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      console.log('🔍 Reverse geocoding:', lat, lng);
      
      const geoData = await geocodeAPI.reverseGeocode(lat, lng);
      
      console.log('✅ Geocoding result:', geoData);
      
      setFormData(prev => ({
        ...prev,
        address: geoData.formatted_address,
        locality: geoData.locality,
        city: geoData.city,
        state: geoData.state,
        road: geoData.road
      }));
      
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      
      // Fallback to coordinates
      setFormData(prev => ({
        ...prev,
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        locality: 'Location captured'
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const analyzeWithAI = async () => {
    if (!formData.title || !formData.description) {
      alert('Please enter title and description first');
      return;
    }

    setLoading(true);
    try {
      const analysis = await analyzeWithGemini(
        formData.title,
        formData.description
      );

      setFormData(prev => ({
        ...prev,
        department: analysis.data.department,
        priority: analysis.data.priority,
        aiSummary: analysis.data.summary,
        category: analysis.data.category,
        suggestedAction: analysis.data.suggestedAction,
        estimatedResolutionTime: analysis.data.estimatedResolutionTime
      }));

      alert('✅ Department assigned successfully!');
    } catch (error) {
      console.error('AI Analysis error:', error);
      alert('AI analysis failed. Please select department manually.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.media) {
      newErrors.media = 'Please capture photo or video evidence';
    }

    if (!formData.location) {
      newErrors.location = 'Location is required';
    }

    if (!formData.department) {
      newErrors.department = 'Please select department or use AI analysis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(formData.media.blob);
      
      reader.onloadend = async () => {
        const base64Media = reader.result;

        const complaintData = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          department: formData.department,
          priority: formData.priority || 'Medium',
          location: formData.location,
          address: formData.address,
          locality: formData.locality,
          media: {
            data: base64Media,
            type: formData.media.type,
            mimeType: formData.media.blob.type
          },
          aiAnalysis: {
            summary: formData.aiSummary,
            category: formData.category,
            suggestedAction: formData.suggestedAction,
            estimatedResolutionTime: formData.estimatedResolutionTime
          }
        };

        try {
          const response = await complaintAPI.create(complaintData);
          
          if (response.data.success) {
            setSuccess('✅ Complaint submitted successfully!');
            
            setFormData({
              title: '',
              description: '',
              media: null,
              location: null,
              address: '',
              locality: '',
              department: '',
              priority: '',
              aiSummary: ''
            });

            setTimeout(() => {
              setActiveTab('my-complaints');
            }, 2000);
          }
        } catch (error) {
          console.error('Submission error:', error);
          alert(error.response?.data?.message || 'Failed to submit complaint. Please try again.');
        } finally {
          setSubmitting(false);
        }
      };

    } catch (error) {
      console.error('Form submission error:', error);
      setSubmitting(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending':
        return 'modern-status-badge pending';
      case 'In Progress':
        return 'modern-status-badge in-progress';
      case 'Resolved':
        return 'modern-status-badge resolved';
      default:
        return 'modern-status-badge';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="modern-dashboard-page">
      {/* Modern Header */}
      <div className="modern-header">
        <div className="container">
          <div className="header-content">
            <div>
              <h1>👤 Citizen Dashboard</h1>
              <p>Welcome back, <strong>{user?.name}</strong></p>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Modern Tabs */}
        <div className="modern-tabs">
          <button
            className={`modern-tab-btn ${activeTab === 'new' ? 'active' : ''}`}
            onClick={() => setActiveTab('new')}
          >
            ➕ New Complaint
          </button>
          <button
            className={`modern-tab-btn ${activeTab === 'my-complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('my-complaints')}
          >
            📋 My Complaints
          </button>
        </div>

        {/* New Complaint Tab */}
        {activeTab === 'new' && (
          <div className="tab-content fade-in">
            <div className="modern-form-card">
              <h2>🆕 Submit New Complaint</h2>
              <p className="form-subtitle">
                Report civic issues with live camera capture and GPS location
              </p>

              {success && (
                <div className="modern-alert modern-alert-success">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Step 1: Describe the Issue */}
                <div className="modern-form-section">
                  <h3>📝 Describe the Issue</h3>
                  
                  <div className="modern-form-group">
                    <label className="modern-form-label">Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`modern-form-input ${errors.title ? 'input-error' : ''}`}
                      placeholder="Brief title of the issue"
                    />
                    {errors.title && <span className="modern-form-error">{errors.title}</span>}
                  </div>

                  <div className="modern-form-group">
                    <label className="modern-form-label">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className={`modern-form-textarea ${errors.description ? 'input-error' : ''}`}
                      placeholder="Detailed description of the problem"
                      rows="5"
                    />
                    {errors.description && <span className="modern-form-error">{errors.description}</span>}
                  </div>
                </div>

                {/* Step 2: Capture Evidence */}
                <div className="modern-form-section">
                  <h3>📸 Capture Evidence</h3>
                  {!formData.media ? (
                    <div className="upload-options">
                      <button
                        type="button"
                        className="modern-btn modern-btn-primary modern-btn-lg"
                        onClick={() => setShowCamera(true)}
                      >
                        📷 Open Camera
                      </button>
                      <span style={{ margin: '0 1rem', color: '#94a3b8' }}>OR</span>
                      <label className="modern-btn modern-btn-secondary modern-btn-lg" style={{ cursor: 'pointer' }}>
                        📁 Upload File
                        <input
                          type="file"
                          accept="image/*,video/*"
                          style={{ display: 'none' }}
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="modern-media-preview">
                      {formData.media.type === 'photo' ? (
                        <img src={formData.media.url} alt="Captured evidence" />
                      ) : (
                        <video src={formData.media.url} controls />
                      )}
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                          type="button"
                          className="modern-btn modern-btn-secondary"
                          onClick={() => setShowCamera(true)}
                        >
                          📷 Recapture
                        </button>
                        <label className="modern-btn modern-btn-secondary" style={{ cursor: 'pointer' }}>
                          📁 Upload Different File
                          <input
                            type="file"
                            accept="image/*,video/*"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  {errors.media && <span className="modern-form-error">{errors.media}</span>}
                </div>

                {/* Step 3: GPS Location */}
                {formData.location && (
                  <div className="modern-form-section">
                    <h3>📍 Location Captured</h3>
                    <div className="modern-location-display">
                      <div className="location-icon">📍</div>
                      <div className="location-details">
                        <div className="location-item">
                          <strong>Locality:</strong>
                          <span>{formData.locality || 'Unknown'}</span>
                        </div>
                        {formData.address && (
                          <div className="location-item">
                            <strong>Address:</strong>
                            <span>{formData.address}</span>
                          </div>
                        )}
                        <div className="location-item">
                          <strong>Coordinates:</strong>
                          <span>
                            {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Auto-Classification */}
                <div className="modern-form-section">
                  <h3>🤖 Step 4: Department Assignment</h3>
                  
                  <button
                    type="button"
                    className="modern-btn modern-btn-ai modern-btn-lg"
                    onClick={analyzeWithAI}
                    disabled={loading || !formData.title || !formData.description}
                  >
                    {loading ? (
                      <>
                        <div className="modern-spinner"></div>
                        <span>Analyzing with AI...</span>
                      </>
                    ) : (
                      '🔍 Auto-Assign with AI'
                    )}
                  </button>

                  {formData.department && (
                    <div className="modern-ai-result">
                      <div className="ai-result-row">
                        <span className="ai-label">Department:</span>
                        <span className="modern-dept-badge">{formData.department}</span>
                      </div>
                      {formData.priority && (
                        <div className="ai-result-row">
                          <span className="ai-label">Priority:</span>
                          <span className={`modern-priority-badge ${formData.priority.toLowerCase()}`}>
                            {formData.priority}
                          </span>
                        </div>
                      )}
                      {formData.aiSummary && (
                        <div className="ai-summary">
                          <strong>AI Summary:</strong>
                          <p>{formData.aiSummary}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="modern-form-group mt-3">
                    <label className="modern-form-label">Department *</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className={`modern-form-select ${errors.department ? 'input-error' : ''}`}
                    >
                      <option value="">Select Department</option>
                      <option value="Road">Road</option>
                      <option value="Water">Water</option>
                      <option value="Electricity">Electricity</option>
                      <option value="Sanitation">Sanitation</option>
                    </select>
                    {errors.department && <span className="modern-form-error">{errors.department}</span>}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  className="modern-btn modern-btn-submit modern-btn-lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="modern-spinner"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    '🚀 Submit Complaint'
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* My Complaints Tab */}
        {activeTab === 'my-complaints' && (
          <div className="tab-content fade-in">
            <div className="section-header-modern">
              <h2>📋 My Complaints</h2>
            </div>
            
            {loading ? (
              <div className="modern-loading">
                <div className="modern-spinner-large"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="modern-empty-state">
                <div className="empty-icon">📭</div>
                <h3>No Complaints Yet</h3>
                <p>You haven't submitted any complaints yet. Click "New Complaint" to get started.</p>
              </div>
            ) : (
              <div className="modern-complaints-grid">
                {complaints.map(complaint => (
                  <div key={complaint._id} className="modern-complaint-card">
                    <div className="modern-card-header">
                      <h3>{complaint.title}</h3>
                      <span className={getStatusBadgeClass(complaint.status)}>
                        {complaint.status}
                      </span>
                    </div>
                    
                    {complaint.media && (
                      <div className="modern-media">
                        {complaint.media.type === 'photo' ? (
                          <img src={complaint.media.url} alt="Complaint evidence" />
                        ) : (
                          <video src={complaint.media.url} controls />
                        )}
                      </div>
                    )}

                    <p className="modern-description">{complaint.description}</p>

                    <div className="modern-card-footer">
                      <div className="footer-info">
                        <span>
                          <span className="footer-icon">🏢</span>
                          {complaint.department}
                        </span>
                        <span>
                          <span className="footer-icon">📍</span>
                          {complaint.locality || 'Unknown locality'}
                        </span>
                        <span>
                          <span className="footer-icon">📅</span>
                          {formatDate(complaint.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default CitizenDashboard;