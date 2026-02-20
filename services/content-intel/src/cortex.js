/**
 * Cortex task reporting client for Content Intelligence service.
 */

const SERVICE_NAME = 'content-intel';

class CortexClient {
  constructor(baseUrl = null, timeout = null, apiKey = null) {
    this.baseUrl = (baseUrl || process.env.CORTEX_URL || 'http://cortex:3011').replace(/\/$/, '');
    this.timeout = timeout || parseFloat(process.env.CORTEX_TIMEOUT || '5000');
    this.apiKey = apiKey || process.env.CORTEX_API_KEY;
    this.enabled = true;
    
    this.headers = {
      'Content-Type': 'application/json',
    };
    
    if (this.apiKey) {
      this.headers['X-API-Key'] = this.apiKey;
    }
  }

  async _post(endpoint, data) {
    if (!this.enabled) {
      return false;
    }

    const url = `${this.baseUrl}/${endpoint.replace(/^\//, '')}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (response.status >= 400) {
        console.warn(`Cortex request failed: ${endpoint} -> ${response.status}`);
        return false;
      }
      return true;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`Cortex request timeout: ${url}`);
      } else {
        console.warn(`Cortex unreachable (${url}), disabling reporting: ${err.message}`);
        this.enabled = false;
      }
      return false;
    }
  }

  async taskStarted(taskId, taskType, description, metadata = {}) {
    const data = {
      service: SERVICE_NAME,
      task_id: taskId,
      task_type: taskType,
      description: description,
      status: 'started',
      timestamp: new Date().toISOString(),
      metadata: metadata,
    };
    return this._post('/api/tasks/start', data);
  }

  async taskProgress(taskId, progress, message = '', metadata = {}) {
    const data = {
      service: SERVICE_NAME,
      task_id: taskId,
      progress: Math.round(progress * 100) / 100,
      message: message,
      timestamp: new Date().toISOString(),
      metadata: metadata,
    };
    return this._post('/api/tasks/progress', data);
  }

  async taskCompleted(taskId, result = 'success', message = '', metadata = {}) {
    const data = {
      service: SERVICE_NAME,
      task_id: taskId,
      status: 'completed',
      result: result,
      message: message,
      timestamp: new Date().toISOString(),
      metadata: metadata,
    };
    return this._post('/api/tasks/complete', data);
  }

  async taskFailed(taskId, error, metadata = {}) {
    const data = {
      service: SERVICE_NAME,
      task_id: taskId,
      status: 'failed',
      error: error,
      timestamp: new Date().toISOString(),
      metadata: metadata,
    };
    return this._post('/api/tasks/fail', data);
  }

  async healthCheck(status = 'ok', details = {}) {
    const data = {
      service: SERVICE_NAME,
      status: status,
      timestamp: new Date().toISOString(),
      details: details,
    };
    return this._post('/api/health', data);
  }
}

// Global instance
let _cortex = null;

export function getCortex() {
  if (!_cortex) {
    _cortex = new CortexClient();
  }
  return _cortex;
}

export default CortexClient;