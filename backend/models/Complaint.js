import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  department: {
    type: String,
    required: true,
    enum: ['Road', 'Water', 'Electricity', 'Sanitation']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved', 'Rejected'],
    default: 'Pending'
  },
  citizen: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    accuracy: Number
  },
  address: {
    type: String,
    default: ''
  },
  locality: {
    type: String,
    default: ''
  },
  media: {
    type: {
      type: String,
      enum: ['photo', 'video']
    },
    url: String,
    mimeType: String
  },
  aiAnalysis: {
    summary: String,
    category: String,
    suggestedAction: String,
    estimatedResolutionTime: String
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  staffNotes: {
    type: String,
    default: ''
  },
  resolvedAt: Date,
  rejectionReason: String,
  nearbyComplaintsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
complaintSchema.index({ location: '2dsphere' });

// Index for filtering
complaintSchema.index({ department: 1, status: 1, priority: 1 });
complaintSchema.index({ createdAt: -1 });

// Calculate priority based on location density and age
complaintSchema.methods.calculatePriority = async function() {
  const Complaint = mongoose.model('Complaint');
  
  // Calculate age in hours
  const ageInHours = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  
  // Find nearby complaints within 50 meters using $geoWithin
  // Convert 50 meters to radians for Earth radius (6378100 meters)
  const radiusInRadians = 50 / 6378100;
  
  try {
    const nearbyComplaints = await Complaint.countDocuments({
      _id: { $ne: this._id },
      location: {
        $geoWithin: {
          $centerSphere: [this.location.coordinates, radiusInRadians]
        }
      },
      status: { $ne: 'Resolved' }
    });
    
    this.nearbyComplaintsCount = nearbyComplaints;
    
    // Priority Logic
    // HIGH: Multiple complaints (≥3) from same location OR age > 72 hours
    if (nearbyComplaints >= 3 || ageInHours > 72) {
      this.priority = 'High';
    }
    // MEDIUM: Exactly 2 complaints nearby AND age between 24-72 hours
    else if (nearbyComplaints === 2 && ageInHours >= 24 && ageInHours <= 72) {
      this.priority = 'Medium';
    }
    // MEDIUM: Age between 24-72 hours (even with 0-1 nearby)
    else if (ageInHours >= 24 && ageInHours <= 72) {
      this.priority = 'Medium';
    }
    // LOW: Only 1 or 0 complaints nearby AND age < 24 hours
    else if (nearbyComplaints <= 1 && ageInHours < 24) {
      this.priority = 'Low';
    }
    // DEFAULT: Medium for edge cases
    else {
      this.priority = 'Medium';
    }
    
    console.log(`📊 Priority calculated for ${this._id}:`, {
      priority: this.priority,
      ageInHours: ageInHours.toFixed(1),
      nearbyComplaints
    });
    
    return this.priority;
  } catch (error) {
    console.error('Error calculating priority:', error);
    // Fallback to time-based priority only
    if (ageInHours > 72) {
      this.priority = 'High';
    } else if (ageInHours >= 24) {
      this.priority = 'Medium';
    } else {
      this.priority = 'Low';
    }
    return this.priority;
  }
};

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;