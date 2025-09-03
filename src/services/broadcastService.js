// Broadcast service for managing broadcast messages
export const broadcastService = {
  // Fetch all broadcast messages (admin only)
  async fetchAllBroadcastMessages(authToken) {
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
      throw error;
    }
  },

  // Fetch active broadcast messages (public)
  async fetchActiveBroadcastMessages() {
    try {
      const response = await fetch('/api/broadcast', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('Error fetching active broadcast messages:', error);
      throw error;
    }
  },

  // Create new broadcast message (admin only)
  async createBroadcastMessage(messageData, authToken) {
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error creating broadcast message:', error);
      throw error;
    }
  },

  // Update broadcast message (admin only)
  async updateBroadcastMessage(id, updates, authToken) {
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, ...updates })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating broadcast message:', error);
      throw error;
    }
  },

  // Delete broadcast message (admin only)
  async deleteBroadcastMessage(id, authToken) {
    try {
      const response = await fetch('/api/admin/broadcast', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting broadcast message:', error);
      throw error;
    }
  }
};