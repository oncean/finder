let ws = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let messageCallbacks = [];
let isConnected = false;
let isConnecting = false;
let currentGroupId = null;
let connectTaskId = 0;
let lastPongAt = 0;

const {
  WS_URL,
  CLOUD_ENV_ID,
  CLOUD_SERVICE,
  USE_CLOUD_CONTAINER
} = require('./config');
const RECONNECT_INTERVAL = 3000;
const HEARTBEAT_INTERVAL = 30000;
const PONG_TIMEOUT = 90000;

async function connect(groupId) {
  const token = wx.getStorageSync('token');
  if (!token || !groupId) return;

  const currentTaskId = ++connectTaskId;
  console.log(`WebSocket connect() 被调用，当前任务ID: ${currentTaskId}`);

  if (isConnecting) {
    console.log('WebSocket 正在连接中，跳过此次调用');
    return;
  }

  if (ws && (isConnected || isConnecting || ws.readyState === 0 || ws.readyState === 1)) {
    console.log('WebSocket 已有活跃连接，关闭旧连接');
    ws.close();
    ws = null;
    isConnected = false;
  }

  isConnecting = true;
  currentGroupId = groupId;

  console.log(`WebSocket 开始连接... (任务ID: ${currentTaskId})`);

  const path = `/ws/chat?token=${encodeURIComponent(token)}&groupId=${encodeURIComponent(groupId)}`;

  try {
    if (shouldUseCloudContainer()) {
      console.log(`WebSocket 使用微信云托管 connectContainer 连接: service=${CLOUD_SERVICE}, path=${path}`);
      const { socketTask } = await wx.cloud.connectContainer({
        config: {
          env: CLOUD_ENV_ID
        },
        service: CLOUD_SERVICE,
        path
      });
      ws = socketTask;
    } else {
      const url = `${WS_URL}?token=${encodeURIComponent(token)}&groupId=${encodeURIComponent(groupId)}`;
      console.log(`WebSocket 使用 wx.connectSocket 直连: ${url}`);
      ws = wx.connectSocket({ url });
    }
  } catch (error) {
    console.error('WebSocket 创建连接失败:', error);
    isConnected = false;
    isConnecting = false;
    if (currentGroupId && currentTaskId === connectTaskId) {
      scheduleReconnect(currentGroupId);
    }
    return;
  }

  ws.onOpen(() => {
    if (currentTaskId !== connectTaskId) {
      console.log(`WebSocket 连接成功但任务ID不匹配，关闭连接 (任务ID: ${currentTaskId}, 当前: ${connectTaskId})`);
      ws.close();
      return;
    }
    console.log('WebSocket 连接成功');
    isConnected = true;
    isConnecting = false;
    lastPongAt = Date.now();
    startHeartbeat();
  });

  ws.onMessage((res) => {
    try {
      console.log('WebSocket 收到消息:', res.data);
      const data = JSON.parse(res.data);
      console.log('解析后的消息:', data.type, data);
      if (data.type === 'pong') {
        lastPongAt = Date.now();
        return;
      }
      if (data.type === 'error' && data.message && data.message.includes('token')) {
        wx.removeStorageSync('token');
        currentGroupId = null;
        stopHeartbeat();
      }
      messageCallbacks.forEach(cb => cb(data));
    } catch (e) {
      console.error('消息解析失败:', e);
    }
  });

  ws.onClose(() => {
    console.log('WebSocket 连接关闭');
    isConnected = false;
    isConnecting = false;
    stopHeartbeat();
    if (currentGroupId && currentTaskId === connectTaskId) {
      scheduleReconnect(currentGroupId);
    }
  });

  ws.onError((err) => {
    console.error('WebSocket 错误:', err);
    isConnected = false;
    isConnecting = false;
  });
}

function shouldUseCloudContainer() {
  return !!(
    USE_CLOUD_CONTAINER &&
    CLOUD_ENV_ID &&
    CLOUD_SERVICE &&
    wx.cloud &&
    wx.cloud.connectContainer
  );
}

function close() {
  connectTaskId++;
  currentGroupId = null;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
  isConnected = false;
  isConnecting = false;
  stopHeartbeat();
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
  if (reconnectTimer) {
    console.log('重连定时器已存在，跳过');
    return;
  }
  if (!currentGroupId) {
    console.log('已关闭连接，不再重连');
    return;
  }
  console.log(`${RECONNECT_INTERVAL/1000}秒后尝试重连...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(groupId);
  }, RECONNECT_INTERVAL);
}

function startHeartbeat() {
  stopHeartbeat();
  heartbeatTimer = setInterval(() => {
    if (lastPongAt && Date.now() - lastPongAt > PONG_TIMEOUT) {
      console.log('WebSocket 心跳超时，准备重连');
      if (ws) {
        ws.close();
      }
      return;
    }
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
