// ---------- types ----------

export interface Task {
  id: string;
  text: string;
  timerMinutes?: number; // optional countdown duration
}

export interface Reward {
  id: string;
  text: string;
}

export interface DoneItem {
  id: string;
  text: string;
  completedAt: string; // ISO date
  durationSeconds: number;
}

export interface ADHD20Data {
  tasks: Task[];
  rewards: Reward[];
  done: DoneItem[];
}

export const DEFAULT_DATA: ADHD20Data = {
  tasks: [],
  rewards: [{ id: 'default-reward', text: '10 minute break' }],
  done: [],
};

// ---------- ID generation ----------

let _idCounter = 0;
export function newId(): string {
  _idCounter++;
  return Date.now().toString(36) + '-' + _idCounter.toString(36);
}

// ---------- task operations ----------

export function addTask(data: ADHD20Data, text: string, timerMinutes?: number): ADHD20Data {
  const task: Task = { id: newId(), text, timerMinutes: timerMinutes || undefined };
  return { ...data, tasks: [...data.tasks, task] };
}

export function editTask(data: ADHD20Data, id: string, text: string, timerMinutes?: number): ADHD20Data {
  return {
    ...data,
    tasks: data.tasks.map(t => t.id === id ? { ...t, text, timerMinutes: timerMinutes || undefined } : t),
  };
}

export function removeTask(data: ADHD20Data, id: string): ADHD20Data {
  return { ...data, tasks: data.tasks.filter(t => t.id !== id) };
}

export function moveTask(data: ADHD20Data, id: string, direction: 'up' | 'down'): ADHD20Data {
  const idx = data.tasks.findIndex(t => t.id === id);
  if (idx < 0) return data;
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= data.tasks.length) return data;
  const tasks = [...data.tasks];
  [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
  return { ...data, tasks };
}

export function deferTask(data: ADHD20Data, id: string): ADHD20Data {
  const idx = data.tasks.findIndex(t => t.id === id);
  if (idx < 0) return data;
  const tasks = [...data.tasks];
  const [task] = tasks.splice(idx, 1);
  tasks.push(task);
  return { ...data, tasks };
}

// ---------- reward operations ----------

export function addReward(data: ADHD20Data, text: string): ADHD20Data {
  return { ...data, rewards: [...data.rewards, { id: newId(), text }] };
}

export function editReward(data: ADHD20Data, id: string, text: string): ADHD20Data {
  return {
    ...data,
    rewards: data.rewards.map(r => r.id === id ? { ...r, text } : r),
  };
}

export function removeReward(data: ADHD20Data, id: string): ADHD20Data {
  return { ...data, rewards: data.rewards.filter(r => r.id !== id) };
}

export function moveReward(data: ADHD20Data, id: string, direction: 'up' | 'down'): ADHD20Data {
  const idx = data.rewards.findIndex(r => r.id === id);
  if (idx < 0) return data;
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= data.rewards.length) return data;
  const rewards = [...data.rewards];
  [rewards[idx], rewards[newIdx]] = [rewards[newIdx], rewards[idx]];
  return { ...data, rewards };
}

// ---------- completion ----------

export function completeTask(data: ADHD20Data, taskId: string, durationSeconds: number): ADHD20Data {
  const task = data.tasks.find(t => t.id === taskId);
  if (!task) return data;
  const done: DoneItem = {
    id: newId(),
    text: task.text,
    completedAt: new Date().toISOString(),
    durationSeconds,
  };
  return {
    ...data,
    tasks: data.tasks.filter(t => t.id !== taskId),
    done: [done, ...data.done],
  };
}

// ---------- roll ----------

export function roll(): number {
  return Math.floor(Math.random() * 20) + 1;
}

export function getRolledItem(data: ADHD20Data, rollResult: number): { type: 'task'; task: Task } | { type: 'reward'; reward: Reward } | null {
  if (rollResult === 20) {
    if (data.rewards.length === 0) return null;
    return { type: 'reward', reward: data.rewards[0] };
  }
  const idx = rollResult - 1;
  if (idx >= data.tasks.length) return null;
  return { type: 'task', task: data.tasks[idx] };
}

// ---------- formatting ----------

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------- beep (Web Audio) ----------

export function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.3;

    // Three short beeps
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 880;
      osc.connect(gain);
      osc.start(ctx.currentTime + i * 0.2);
      osc.stop(ctx.currentTime + i * 0.2 + 0.1);
    }
  } catch {
    // Audio not available
  }
}
