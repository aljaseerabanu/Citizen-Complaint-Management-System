import { useState, useRef, useEffect } from 'react';
import './CameraCapture.css';

const CameraCapture = ({ onCapture, onClose }) => {
  const [stream, setStream] = useState(null);
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [mediaType, setMediaType] = useState('photo'); // 'photo' or 'video'
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');

  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Start camera when component mounts
  useEffect(() => {
    startCamera();
    getLocation();

    return () => {
      stopCamera();
    };
  }, []);

  // Start camera stream
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
        audio: mediaType === 'video'
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please grant camera permissions.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  // Get GPS location
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError('Getting your location...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Location obtained:', position.coords);
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationError(''); // Clear error
      },
      (error) => {
        console.error('❌ Location error:', error);
        let errorMsg = 'Unable to get location. ';
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg += 'Please allow location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg += 'Location information unavailable.';
            break;
          case error.TIMEOUT:
            errorMsg += 'Location request timed out.';
            break;
          default:
            errorMsg += 'Unknown error occurred.';
        }
        
        setLocationError(errorMsg);
        
        // Set a default location for testing (you can remove this in production)
        setLocation({
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy: 100
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Capture photo
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedMedia({ url, blob, type: 'photo' });
    }, 'image/jpeg', 0.95);
  };

  // Start video recording
  const startRecording = async () => {
    try {
      // Restart camera with audio for video
      stopCamera();
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      recordedChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setCapturedMedia({ url, blob, type: 'video' });
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);

    } catch (err) {
      console.error('Recording error:', err);
      setError('Unable to start recording. Please check camera and microphone permissions.');
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Retake media
  const retake = () => {
    setCapturedMedia(null);
    if (!stream) {
      startCamera();
    }
  };

  // Confirm and send captured media
  const confirmCapture = () => {
    if (capturedMedia && location) {
      onCapture({
        media: capturedMedia,
        location: location
      });
      stopCamera();
      onClose();
    } else if (!location) {
      setError('Location is required. Please enable location services.');
    }
  };

  return (
    <div className="camera-modal">
      <div className="camera-container">
        <div className="camera-header">
          <h3>📸 Capture Evidence</h3>
          <button className="close-btn" onClick={() => {
            stopCamera();
            onClose();
          }}>
            ✕
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {locationError && (
          <div className="alert alert-warning">
            ⚠️ {locationError}
          </div>
        )}

        <div className="camera-view">
          {!capturedMedia ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="video-preview"
              />
              
              {isRecording && (
                <div className="recording-indicator">
                  <span className="recording-dot"></span>
                  Recording...
                </div>
              )}
            </>
          ) : (
            <div className="media-preview">
              {capturedMedia.type === 'photo' ? (
                <img src={capturedMedia.url} alt="Captured" />
              ) : (
                <video src={capturedMedia.url} controls />
              )}
            </div>
          )}
        </div>

        {location && (
          <div className="location-info">
            <span className="location-icon">📍</span>
            <span>
              Location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            </span>
          </div>
        )}

        <div className="camera-controls">
          {!capturedMedia ? (
            <>
              <div className="media-type-toggle">
                <button
                  className={`toggle-btn ${mediaType === 'photo' ? 'active' : ''}`}
                  onClick={() => setMediaType('photo')}
                  disabled={isRecording}
                >
                  📷 Photo
                </button>
                <button
                  className={`toggle-btn ${mediaType === 'video' ? 'active' : ''}`}
                  onClick={() => setMediaType('video')}
                  disabled={isRecording}
                >
                  🎥 Video
                </button>
              </div>

              <div className="capture-buttons">
                {mediaType === 'photo' ? (
                  <button 
                    className="capture-btn photo-btn"
                    onClick={capturePhoto}
                    disabled={!stream}
                  >
                    📸 Capture Photo
                  </button>
                ) : (
                  <>
                    {!isRecording ? (
                      <button 
                        className="capture-btn video-btn"
                        onClick={startRecording}
                        disabled={!stream}
                      >
                        ⏺️ Start Recording
                      </button>
                    ) : (
                      <button 
                        className="capture-btn stop-btn"
                        onClick={stopRecording}
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="confirm-buttons">
              <button className="btn btn-secondary" onClick={retake}>
                🔄 Retake
              </button>
              <button 
                className="btn btn-primary"
                onClick={confirmCapture}
                disabled={!location}
              >
                ✓ Use This {capturedMedia.type === 'photo' ? 'Photo' : 'Video'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;