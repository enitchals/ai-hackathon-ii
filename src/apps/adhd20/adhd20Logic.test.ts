import { describe, it, expect } from 'vitest';
import {
  addTask,
  editTask,
  removeTask,
  moveTask,
  deferTask,
  addReward,
  editReward,
  removeReward,
  moveReward,
  completeTask,
  roll,
  getRolledItem,
  formatDuration,
  DEFAULT_DATA,
  type ADHD20Data,
} from './adhd20Logic';

function withTasks(count: number): ADHD20Data {
  let data = { ...DEFAULT_DATA };
  for (let i = 1; i <= count; i++) {
    data = addTask(data, `Task ${i}`);
  }
  return data;
}

describe('task operations', () => {
  it('adds a task', () => {
    const data = addTask(DEFAULT_DATA, 'Do laundry');
    expect(data.tasks).toHaveLength(1);
    expect(data.tasks[0].text).toBe('Do laundry');
  });

  it('adds a task with timer', () => {
    const data = addTask(DEFAULT_DATA, 'Focus session', 25);
    expect(data.tasks[0].timerMinutes).toBe(25);
  });

  it('edits a task', () => {
    let data = addTask(DEFAULT_DATA, 'Old text');
    const id = data.tasks[0].id;
    data = editTask(data, id, 'New text', 10);
    expect(data.tasks[0].text).toBe('New text');
    expect(data.tasks[0].timerMinutes).toBe(10);
  });

  it('removes a task', () => {
    let data = addTask(DEFAULT_DATA, 'Remove me');
    const id = data.tasks[0].id;
    data = removeTask(data, id);
    expect(data.tasks).toHaveLength(0);
  });

  it('moves a task up', () => {
    const data = withTasks(3);
    const id = data.tasks[1].id;
    const moved = moveTask(data, id, 'up');
    expect(moved.tasks[0].id).toBe(id);
  });

  it('moves a task down', () => {
    const data = withTasks(3);
    const id = data.tasks[0].id;
    const moved = moveTask(data, id, 'down');
    expect(moved.tasks[1].id).toBe(id);
  });

  it('clamps move at edges', () => {
    const data = withTasks(3);
    const moved = moveTask(data, data.tasks[0].id, 'up');
    expect(moved.tasks[0].id).toBe(data.tasks[0].id);
  });

  it('defers a task to end', () => {
    const data = withTasks(5);
    const id = data.tasks[0].id;
    const deferred = deferTask(data, id);
    expect(deferred.tasks[deferred.tasks.length - 1].id).toBe(id);
    expect(deferred.tasks).toHaveLength(5);
  });
});

describe('reward operations', () => {
  it('starts with default reward', () => {
    expect(DEFAULT_DATA.rewards).toHaveLength(1);
    expect(DEFAULT_DATA.rewards[0].text).toBe('10 minute break');
  });

  it('adds a reward', () => {
    const data = addReward(DEFAULT_DATA, 'Snack time');
    expect(data.rewards).toHaveLength(2);
  });

  it('edits a reward', () => {
    const id = DEFAULT_DATA.rewards[0].id;
    const data = editReward(DEFAULT_DATA, id, '15 minute break');
    expect(data.rewards[0].text).toBe('15 minute break');
  });

  it('removes a reward', () => {
    const id = DEFAULT_DATA.rewards[0].id;
    const data = removeReward(DEFAULT_DATA, id);
    expect(data.rewards).toHaveLength(0);
  });

  it('reorders rewards', () => {
    let data = addReward(DEFAULT_DATA, 'Second reward');
    const id = data.rewards[1].id;
    data = moveReward(data, id, 'up');
    expect(data.rewards[0].id).toBe(id);
  });
});

describe('completion', () => {
  it('moves task to done list', () => {
    let data = addTask(DEFAULT_DATA, 'Finish this');
    const taskId = data.tasks[0].id;
    data = completeTask(data, taskId, 120);
    expect(data.tasks).toHaveLength(0);
    expect(data.done).toHaveLength(1);
    expect(data.done[0].text).toBe('Finish this');
    expect(data.done[0].durationSeconds).toBe(120);
  });

  it('most recent done item is first', () => {
    let data = addTask(DEFAULT_DATA, 'First');
    data = addTask(data, 'Second');
    data = completeTask(data, data.tasks[0].id, 60);
    data = completeTask(data, data.tasks[0].id, 90);
    expect(data.done[0].text).toBe('Second');
  });
});

describe('roll', () => {
  it('returns 1-20', () => {
    for (let i = 0; i < 100; i++) {
      const r = roll();
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    }
  });
});

describe('getRolledItem', () => {
  it('returns task for rolls 1-19', () => {
    const data = withTasks(19);
    const result = getRolledItem(data, 1);
    expect(result?.type).toBe('task');
    if (result?.type === 'task') expect(result.task.text).toBe('Task 1');

    const result5 = getRolledItem(data, 5);
    if (result5?.type === 'task') expect(result5.task.text).toBe('Task 5');
  });

  it('returns reward for roll 20', () => {
    const data = withTasks(19);
    const result = getRolledItem(data, 20);
    expect(result?.type).toBe('reward');
  });

  it('returns null when task index out of range', () => {
    const data = withTasks(3);
    const result = getRolledItem(data, 10);
    expect(result).toBeNull();
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3661)).toBe('1:01:01');
  });
});
