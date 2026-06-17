import io from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
  }

  connect(user) {
    try {
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        query: { userId: user?._id }
      });

      this.socket.on('connect', () => {
        console.log('✅ Socket connected');
        this.connected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        this.connected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Socket error:', error);
        this.connected = false;
      });

    } catch (error) {
      console.error('Socket init failed:', error);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.connected = false;
    }
  }

  onNewComplaint(callback) {
    if (this.socket) {
      this.socket.on('newComplaint', callback);
    }
  }

  onComplaintUpdated(callback) {
    if (this.socket) {
      this.socket.on('complaintUpdated', callback);
    }
  }

  removeAllListeners() {
    if (this.socket) {
      this.socket.removeAllListeners();
    }
  }
}

export default new SocketService();