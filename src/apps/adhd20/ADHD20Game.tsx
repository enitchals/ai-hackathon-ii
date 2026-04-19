import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import EditIcon from '@mui/icons-material/Edit';
import { GameShell } from '../../common/components';
import { useAppStorage } from '../../common/hooks';
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
  playBeep,
  DEFAULT_DATA,
  type ADHD20Data,
  type Task,
  type Reward,
} from './adhd20Logic';
import './adhd20.css';

// ---------- D20 component ----------

function D20Die({ value, rolling, onClick }: { value: number | null; rolling: boolean; onClick: () => void }) {
  // Classic D20 icosahedron viewed head-on: hexagonal outline, triangular facets
  const fill = 'var(--accent-purple, #9b5de5)';
  const stroke = 'var(--accent-pink, #f78da7)';
  const sw = '2.5'; // stroke width
  // Outer hexagon vertices (pointy-top, centered at 100,100, radius ~90)
  const top = '100,10';
  const topRight = '188,55';
  const botRight = '188,145';
  const bottom = '100,190';
  const botLeft = '12,145';
  const topLeft = '12,55';
  // Inner triangle vertices (the large front face)
  const innerTop = '100,42';
  const innerBotLeft = '40,138';
  const innerBotRight = '160,138';

  return (
    <div className="d20-container">
      <div className={`d20${rolling ? ' rolling' : ''}`} onClick={onClick} role="button" tabIndex={0}>
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          {/* Outer hexagonal silhouette */}
          <polygon
            points={`${top} ${topRight} ${botRight} ${bottom} ${botLeft} ${topLeft}`}
            fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round"
          />
          {/* Inner front-face triangle (slightly lighter) */}
          <polygon
            points={`${innerTop} ${innerBotRight} ${innerBotLeft}`}
            fill="rgba(255,255,255,0.1)" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
          />
          {/* Top facet lines: outer top → inner top corners */}
          <line x1="100" y1="10" x2="100" y2="42" stroke={stroke} strokeWidth={sw} />
          <line x1="100" y1="10" x2="40" y2="138" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          <line x1="100" y1="10" x2="160" y2="138" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          {/* Upper-left facets */}
          <line x1="12" y1="55" x2="100" y2="42" stroke={stroke} strokeWidth={sw} />
          <line x1="12" y1="55" x2="40" y2="138" stroke={stroke} strokeWidth={sw} />
          {/* Upper-right facets */}
          <line x1="188" y1="55" x2="100" y2="42" stroke={stroke} strokeWidth={sw} />
          <line x1="188" y1="55" x2="160" y2="138" stroke={stroke} strokeWidth={sw} />
          {/* Lower-left facets */}
          <line x1="12" y1="145" x2="40" y2="138" stroke={stroke} strokeWidth={sw} />
          <line x1="12" y1="145" x2="100" y2="190" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          {/* Lower-right facets */}
          <line x1="188" y1="145" x2="160" y2="138" stroke={stroke} strokeWidth={sw} />
          <line x1="188" y1="145" x2="100" y2="190" stroke={stroke} strokeWidth={sw} opacity="0.4" />
          {/* Bottom facets */}
          <line x1="100" y1="190" x2="40" y2="138" stroke={stroke} strokeWidth={sw} />
          <line x1="100" y1="190" x2="160" y2="138" stroke={stroke} strokeWidth={sw} />
        </svg>
        <span className="d20-label">{value ?? '?'}</span>
      </div>
    </div>
  );
}

// ---------- Focus modal ----------

function FocusModal({
  item,
  onDefer,
  onDone,
  onClose,
}: {
  item: { type: 'task'; task: Task } | { type: 'reward'; reward: Reward };
  onDefer: () => void;
  onDone: (durationSeconds: number) => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'prompt' | 'working' | 'reward'>('prompt');
  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [timerDone, setTimerDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const startTimeRef = useRef(0);
  const beeped = useRef(false);

  const isReward = item.type === 'reward';
  const text = isReward ? item.reward.text : item.task.text;
  const hasCountdown = !isReward && item.task.timerMinutes != null && item.task.timerMinutes > 0;
  const countdownSeconds = hasCountdown ? item.task.timerMinutes! * 60 : 0;

  const handleStart = useCallback(() => {
    if (isReward) {
      setPhase('reward');
      return;
    }
    setPhase('working');
    startTimeRef.current = Date.now();
    if (hasCountdown) {
      setRemaining(countdownSeconds);
    }
  }, [isReward, hasCountdown, countdownSeconds]);

  // Timer tick
  useEffect(() => {
    if (phase !== 'working') return;

    intervalRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);

      if (hasCountdown) {
        const rem = Math.max(0, countdownSeconds - secs);
        setRemaining(rem);
        if (rem === 0 && !beeped.current) {
          beeped.current = true;
          setTimerDone(true);
          playBeep();
        }
      }
    }, 200);

    return () => clearInterval(intervalRef.current);
  }, [phase, hasCountdown, countdownSeconds]);

  const canFinish = !hasCountdown || timerDone;

  return (
    <div className="focus-overlay" onClick={(e) => { if (e.target === e.currentTarget && phase === 'prompt') onClose(); }}>
      <div className="focus-card">
        {isReward && (
          <>
            <div className="focus-title">🎉 You rolled a 20!</div>
            <div className="focus-task-text">{text}</div>
            {phase === 'prompt' ? (
              <div className="focus-actions">
                <Button variant="outlined" onClick={onClose}>Dismiss</Button>
                <Button variant="contained" onClick={handleStart}>Enjoy!</Button>
              </div>
            ) : (
              <div className="focus-actions">
                <Button variant="contained" onClick={onClose}>Done</Button>
              </div>
            )}
          </>
        )}

        {!isReward && phase === 'prompt' && (
          <>
            <div className="focus-title">Your next task:</div>
            <div className="focus-task-text">{text}</div>
            {hasCountdown && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Timer: {formatDuration(countdownSeconds)}
              </Typography>
            )}
            <div className="focus-actions">
              <Button variant="outlined" onClick={onDefer}>Defer</Button>
              <Button variant="contained" onClick={handleStart}>Start</Button>
            </div>
          </>
        )}

        {!isReward && phase === 'working' && (
          <>
            <div className="focus-title">Working on:</div>
            <div className="focus-task-text">{text}</div>
            <div className={`focus-timer${timerDone ? ' flash' : ''}`}>
              {hasCountdown ? formatDuration(remaining) : formatDuration(elapsed)}
            </div>
            {hasCountdown && !timerDone && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Finish when the timer reaches 0
              </Typography>
            )}
            <div className="focus-actions">
              <Button
                variant="contained"
                disabled={!canFinish}
                onClick={() => onDone(elapsed)}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Roll tab ----------

function RollTab({
  data,
  onRoll,
}: {
  data: ADHD20Data;
  onRoll: (result: number) => void;
}) {
  const [dieValue, setDieValue] = useState<number | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleRoll = useCallback(() => {
    if (rolling) return;
    if (data.tasks.length === 0) return;
    setRolling(true);

    // Animate through random numbers
    let count = 0;
    const interval = setInterval(() => {
      setDieValue(Math.floor(Math.random() * 20) + 1);
      count++;
      if (count >= 12) {
        clearInterval(interval);
        const result = roll();
        // If result > available tasks and isn't 20, re-roll within range
        const maxRoll = Math.min(data.tasks.length, 19);
        const finalResult = result === 20 && data.rewards.length > 0
          ? 20
          : ((result - 1) % maxRoll) + 1;
        setDieValue(finalResult);
        setRolling(false);
        onRoll(finalResult);
      }
    }, 80);
  }, [rolling, data.tasks.length, data.rewards.length, onRoll]);

  const top19 = data.tasks.slice(0, 19);
  const topReward = data.rewards[0];

  return (
    <Box>
      <D20Die value={dieValue} rolling={rolling} onClick={handleRoll} />

      {data.tasks.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Add some tasks on the Tasks tab to get started!
        </Typography>
      ) : (
        <ul className="roll-list">
          {top19.map((task, i) => (
            <li
              key={task.id}
              className={`roll-list-item${dieValue === i + 1 && !rolling ? ' highlight' : ''}`}
            >
              <span className="roll-list-num">{i + 1}.</span>
              <span>{task.text}</span>
              {task.timerMinutes != null && (
                <span className="crud-item-timer">({task.timerMinutes}m)</span>
              )}
            </li>
          ))}
          {topReward && (
            <li
              className={`roll-list-item reward-row${dieValue === 20 && !rolling ? ' highlight' : ''}`}
            >
              <span className="roll-list-num">20.</span>
              <span>🎉 {topReward.text}</span>
            </li>
          )}
        </ul>
      )}
    </Box>
  );
}

// ---------- Tasks tab ----------

function TasksTab({
  data,
  onChange,
}: {
  data: ADHD20Data;
  onChange: (data: ADHD20Data) => void;
}) {
  const [newText, setNewText] = useState('');
  const [newTimer, setNewTimer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editTimer, setEditTimer] = useState('');

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    const timer = parseInt(newTimer) || undefined;
    onChange(addTask(data, text, timer));
    setNewText('');
    setNewTimer('');
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setEditText(task.text);
    setEditTimer(task.timerMinutes?.toString() ?? '');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const timer = parseInt(editTimer) || undefined;
    onChange(editTask(data, editingId, editText.trim(), timer));
    setEditingId(null);
  };

  return (
    <Box>
      <div className="add-form">
        <TextField
          size="small"
          label="New task"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          label="Min"
          type="number"
          value={newTimer}
          onChange={(e) => setNewTimer(e.target.value)}
          sx={{ width: 70 }}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <Button variant="contained" size="small" onClick={handleAdd}>Add</Button>
      </div>

      <div className="crud-list">
        {data.tasks.map((task, i) => (
          <div key={task.id} className={`crud-item${i < 19 ? ' top-19' : ''}`}>
            {editingId === task.id ? (
              <>
                <TextField
                  size="small"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Min"
                  type="number"
                  value={editTimer}
                  onChange={(e) => setEditTimer(e.target.value)}
                  sx={{ width: 70 }}
                />
                <Button size="small" onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <>
                <span className="crud-item-text">{task.text}</span>
                {task.timerMinutes != null && (
                  <span className="crud-item-timer">{task.timerMinutes}m</span>
                )}
                <div className="crud-item-actions">
                  <IconButton size="small" onClick={() => onChange(moveTask(data, task.id, 'up'))} disabled={i === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onChange(moveTask(data, task.id, 'down'))} disabled={i === data.tasks.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleEdit(task)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onChange(removeTask(data, task.id))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {data.tasks.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          No tasks yet — add one above!
        </Typography>
      )}
    </Box>
  );
}

// ---------- Rewards tab ----------

function RewardsTab({
  data,
  onChange,
}: {
  data: ADHD20Data;
  onChange: (data: ADHD20Data) => void;
}) {
  const [newText, setNewText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = () => {
    const text = newText.trim();
    if (!text) return;
    onChange(addReward(data, text));
    setNewText('');
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    onChange(editReward(data, editingId, editText.trim()));
    setEditingId(null);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        The top reward is what you get when you roll a 20!
      </Typography>

      <div className="add-form">
        <TextField
          size="small"
          label="New reward"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          sx={{ flex: 1 }}
        />
        <Button variant="contained" size="small" onClick={handleAdd}>Add</Button>
      </div>

      <div className="crud-list">
        {data.rewards.map((reward, i) => (
          <div key={reward.id} className={`crud-item${i === 0 ? ' top-19' : ''}`}>
            {editingId === reward.id ? (
              <>
                <TextField
                  size="small"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); }}
                  sx={{ flex: 1 }}
                />
                <Button size="small" onClick={handleSaveEdit}>Save</Button>
              </>
            ) : (
              <>
                <span className="crud-item-text">
                  {i === 0 ? '🎉 ' : ''}{reward.text}
                </span>
                <div className="crud-item-actions">
                  <IconButton size="small" onClick={() => onChange(moveReward(data, reward.id, 'up'))} disabled={i === 0}>
                    <ArrowUpwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onChange(moveReward(data, reward.id, 'down'))} disabled={i === data.rewards.length - 1}>
                    <ArrowDownwardIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => { setEditingId(reward.id); setEditText(reward.text); }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => onChange(removeReward(data, reward.id))}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Box>
  );
}

// ---------- Done tab ----------

function DoneTab({ data }: { data: ADHD20Data }) {
  return (
    <Box>
      {data.done.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          Nothing completed yet — roll the die and get started!
        </Typography>
      ) : (
        <div className="crud-list">
          {data.done.map((item) => (
            <div key={item.id} className="done-item">
              <span>{item.text}</span>
              <span className="done-meta">
                {formatDuration(item.durationSeconds)} · {new Date(item.completedAt).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Box>
  );
}

// ---------- main component ----------

export default function ADHD20Game() {
  const [data, setData] = useAppStorage<ADHD20Data>('adhd20', 'data', DEFAULT_DATA);
  const [tab, setTab] = useState(0);
  const [focusItem, setFocusItem] = useState<ReturnType<typeof getRolledItem>>(null);
  const handleRoll = useCallback((result: number) => {
    const item = getRolledItem(data, result);
    if (item) {
      // Small delay so user sees the number on the die first
      setTimeout(() => setFocusItem(item), 400);
    }
  }, [data]);

  const handleDefer = useCallback(() => {
    if (focusItem?.type === 'task') {
      setData((d) => deferTask(d, focusItem.task.id));
    }
    setFocusItem(null);
  }, [focusItem, setData]);

  const handleDone = useCallback((durationSeconds: number) => {
    if (focusItem?.type === 'task') {
      setData((d) => completeTask(d, focusItem.task.id, durationSeconds));
    }
    setFocusItem(null);
  }, [focusItem, setData]);

  const handleClose = useCallback(() => {
    setFocusItem(null);
  }, []);

  return (
    <GameShell maxWidth="sm">
      <Typography variant="h5" sx={{ fontWeight: 700, textAlign: 'center', mb: 1 }}>
        🎲 ADHD20
      </Typography>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        sx={{ mb: 2 }}
      >
        <Tab label="Roll" />
        <Tab label={`Tasks (${data.tasks.length})`} />
        <Tab label="Rewards" />
        <Tab label={`Done (${data.done.length})`} />
      </Tabs>

      {tab === 0 && <RollTab data={data} onRoll={handleRoll} />}
      {tab === 1 && <TasksTab data={data} onChange={setData} />}
      {tab === 2 && <RewardsTab data={data} onChange={setData} />}
      {tab === 3 && <DoneTab data={data} />}

      {/* Focus modal */}
      {focusItem && (
        <FocusModal
          item={focusItem}
          onDefer={handleDefer}
          onDone={handleDone}
          onClose={handleClose}
        />
      )}
    </GameShell>
  );
}
