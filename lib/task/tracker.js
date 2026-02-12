/**
 * 작업 추적기
 * 진행 중인 작업 목록과 상태를 관리
 */
const fs = require('fs');
const path = require('path');

const TRACKER_FILENAME = '.demodev/task-tracker.json';

function getTrackerPath(projectRoot) {
  return path.join(projectRoot, TRACKER_FILENAME);
}

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 작업 목록 조회
 */
function getTasks(projectRoot) {
  const filePath = getTrackerPath(projectRoot);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { tasks: [], lastUpdated: null };
}

/**
 * 작업 추가
 */
function addTask(projectRoot, task) {
  const data = getTasks(projectRoot);
  const newTask = {
    id: data.tasks.length + 1,
    ...task,
    status: 'pending',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  data.tasks.push(newTask);
  data.lastUpdated = new Date().toISOString();
  saveTasks(projectRoot, data);
  return newTask;
}

/**
 * 작업 상태 업데이트
 */
function updateTask(projectRoot, taskId, updates) {
  const data = getTasks(projectRoot);
  const task = data.tasks.find(t => t.id === taskId);
  if (task) {
    Object.assign(task, updates);
    if (updates.status === 'completed') {
      task.completedAt = new Date().toISOString();
    }
    data.lastUpdated = new Date().toISOString();
    saveTasks(projectRoot, data);
  }
  return task;
}

/**
 * 다음 처리할 작업 조회
 */
function getNextTask(projectRoot) {
  const data = getTasks(projectRoot);
  return data.tasks
    .filter(t => t.status === 'pending')
    .sort((a, b) => (a.order || a.id) - (b.order || b.id))[0] || null;
}

/**
 * 완료되지 않은 작업 수
 */
function getPendingCount(projectRoot) {
  const data = getTasks(projectRoot);
  return data.tasks.filter(t => t.status !== 'completed').length;
}

/**
 * 작업 목록 초기화
 */
function clearTasks(projectRoot) {
  const filePath = getTrackerPath(projectRoot);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function saveTasks(projectRoot, data) {
  const filePath = getTrackerPath(projectRoot);
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { getTasks, addTask, updateTask, getNextTask, getPendingCount, clearTasks };
