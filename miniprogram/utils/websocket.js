let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let messageCallbacks = [];
let isConnected = false;

const WS_URL = 'ws://localhost:3000/ws/chat';
const RECONNECT_INTERVAL = 3000;
const HEARTBEAT_INTERVAL = 30000;

function connect(groupId) {
  const token = wx.getStorageSync('token');
  if (!token || !groupId) return;

  // 关闭已有连接
  close();

  ws = wx.connectSocket({
    url: `${WS_URL}?token=${token}&groupId=${groupId}`
  });

  ws.onOpen(() => {
    console.log('WebSocket 连接成功');
    isConnected = true;
    startHeartbeat();
  });

  ws.onMessage((res) => {
    try {
      const data = JSON.parse(res.data);
      messageCallbacks.forEach(cb => cb(data));
    } catch (e) {
      console.error('消息解析失败:', e);
    }
  });

  ws.onClose(() => {
    console.log('WebSocket 连接关闭');
    isConnected = false;
    stopHeartbeat();
    scheduleReconnect(groupId);
  });

  ws.onError((err) => {
    console.error('WebSocket 错误:', err);
    isConnected = false;
    scheduleReconnect(groupId);
  });
}

function close() {
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected = false;
  stopHeartbeat();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function send(data) {
  if (ws && isConnected) {
    ws.send({
      data: JSON.stringify(data)
    });
  }
}

function onMessage(callback) {
  messageCallbacks.push(callback);
  return () => {
    messageCallbacks = messageCallbacks.filter(cb => cb !== callback);
  };
}

function scheduleReconnect(groupId) {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(groupId);
  }, RECONNECT_INTERVAL);
}

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    send({ type: 'ping' });
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

module.exports = {
  connect,
  close,
  send,
  onMessage,
  isConnected: () => isConnected
};
