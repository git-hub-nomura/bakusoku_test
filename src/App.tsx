/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  User as UserIcon, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X, 
  Filter, 
  ArrowUpDown, 
  FileText,
  Trash2,
  LogIn,
  LogOut
} from 'lucide-react';
import { Task, User, Priority, Status, ColumnType } from './types';

// --- Constants & Helpers ---

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '佐藤', avatar: '佐藤', color: 'bg-pink-500' },
  { id: 'u2', name: '鈴木', avatar: '鈴木', color: 'bg-blue-500' },
  { id: 'u3', name: '高橋', avatar: '高橋', color: 'bg-green-500' },
  { id: 'u4', name: '田中', avatar: '田中', color: 'bg-purple-500' },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'デザインシステムの更新', dueDate: new Date().toISOString().split('T')[0], priority: 'High', status: 'In Progress', assigneeIds: ['u1', 'u2'], memo: 'カラーパレットとタイポグラフィの更新が必要です。' },
  { id: 't2', title: 'クライアントミーティング準備', dueDate: new Date().toISOString().split('T')[0], priority: 'Medium', status: 'Not Started', assigneeIds: ['u2'] },
  { id: 't3', title: 'バグ修正: ログイン問題', dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], priority: 'High', status: 'Waiting for Review', assigneeIds: ['u3'] },
  { id: 't4', title: 'コンテンツレビュー', dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], priority: 'Low', status: 'Not Started', assigneeIds: ['u1'] },
  { id: 't5', title: '月次レポート作成', dueDate: new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0], priority: 'Medium', status: 'In Progress', assigneeIds: ['u4'] },
  { id: 't6', title: '将来のプロジェクト計画', dueDate: new Date(Date.now() + 86400000 * 40).toISOString().split('T')[0], priority: 'Low', status: 'Not Started', assigneeIds: ['u1'] },
  { id: 't7', title: '未定のタスク', dueDate: '', priority: 'Low', status: 'Not Started', assigneeIds: [] },
];

const COLUMNS: { id: ColumnType; title: string; bg: string; border: string; headerBg: string }[] = [
  { id: 'today', title: '今日まで', bg: 'bg-red-50', border: 'border-red-200', headerBg: 'bg-[#FFEBEE]' },
  { id: 'week', title: '今週まで', bg: 'bg-blue-50', border: 'border-blue-200', headerBg: 'bg-[#E3F2FD]' },
  { id: 'month', title: '今月末まで', bg: 'bg-green-50', border: 'border-green-200', headerBg: 'bg-[#E8F5E9]' },
  { id: 'future', title: '来月以降', bg: 'bg-purple-50', border: 'border-purple-200', headerBg: 'bg-[#F3E5F5]' },
  { id: 'undecided', title: '未定', bg: 'bg-gray-50', border: 'border-gray-200', headerBg: 'bg-[#F5F5F5]' },
];

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getEndOfWeekStr = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) + 6; // adjust when day is sunday
  const endOfWeek = new Date(d.setDate(diff));
  return endOfWeek.toISOString().split('T')[0];
};

const getEndOfMonthStr = () => {
  const d = new Date();
  const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return endOfMonth.toISOString().split('T')[0];
};

const isOverdue = (dateStr: string) => {
  return dateStr < getTodayStr();
};

const getColumnForDate = (dateStr: string): ColumnType => {
  if (!dateStr) return 'undecided';
  
  const today = getTodayStr();
  const endOfWeek = getEndOfWeekStr();
  const endOfMonth = getEndOfMonthStr();
  
  if (dateStr <= today) return 'today';
  if (dateStr <= endOfWeek) return 'week';
  if (dateStr <= endOfMonth) return 'month';
  return 'future';
};

const PRIORITY_LABELS: Record<Priority, string> = {
  High: '高',
  Medium: '中',
  Low: '低'
};

const STATUS_LABELS: Record<Status, string> = {
  'Not Started': '未着手',
  'In Progress': '進行中',
  'Waiting for Review': 'レビュー待ち',
  'Completed': '完了'
};

// --- Components ---

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // true: Admin, false: Worker
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [showUnassignedAlert, setShowUnassignedAlert] = useState(false);
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);

  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);
  const [columnSorts, setColumnSorts] = useState<Record<ColumnType, 'asc' | 'desc' | null>>({
    today: null,
    week: null,
    month: null,
    future: null,
    undecided: null
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');

  // --- Handlers ---

  const handleLogin = () => {
    setLoginError('');
    
    if (!loginId.trim()) {
      setLoginError('IDを入力してください。');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('パスワードを入力してください。');
      return;
    }

    if (loginId === 'admin' && loginPassword === 'admin') {
      setIsLoggedIn(true);
      setIsAdmin(true);
      // Check alerts on login
      checkAlerts(true);
    } else if (loginId === 'user' && loginPassword === 'user') {
      setIsLoggedIn(true);
      setIsAdmin(false);
    } else {
      setLoginError('IDまたはパスワードが違います。');
    }
  };

  const checkAlerts = (adminStatus: boolean) => {
    if (!adminStatus) return;
    
    // Check unassigned tasks
    const unassignedCount = tasks.filter(t => t.assigneeIds.length === 0).length;
    if (unassignedCount > 0) setShowUnassignedAlert(true);

    // Check overdue incomplete tasks
    const todayStr = getTodayStr();
    const overdueCount = tasks.filter(t => t.dueDate <= todayStr && t.status !== 'Completed').length;
    if (overdueCount > 0) setShowOverdueAlert(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsAdmin(false);
    setLoginId('');
    setLoginPassword('');
    setLoginError('');
    setShowUnassignedAlert(false);
    setShowOverdueAlert(false);
  };

  const handleDragStartTask = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    if (!isAdmin) return; // Workers cannot drag tasks
    setDraggedTaskId(taskId);
    setDraggedUserId(null);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragStartUser = (e: React.DragEvent<HTMLDivElement>, userId: string) => {
    if (!isAdmin) return; // Workers cannot drag users (to assign)
    setDraggedUserId(userId);
    setDraggedTaskId(null);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDropColumn = (e: React.DragEvent<HTMLDivElement>, columnId: ColumnType) => {
    e.preventDefault();
    if (!isAdmin) return; // Workers cannot move tasks

    if (draggedTaskId) {
      const task = tasks.find(t => t.id === draggedTaskId);
      if (task) {
        let newDate = task.dueDate;
        if (columnId === 'today') newDate = getTodayStr();
        else if (columnId === 'week') newDate = getEndOfWeekStr();
        else if (columnId === 'month') newDate = getEndOfMonthStr();
        else if (columnId === 'future') {
           // Set to first day of next month if moving to future
           const d = new Date();
           const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
           newDate = nextMonth.toISOString().split('T')[0];
        }
        else if (columnId === 'undecided') newDate = '';

        setTasks(prev => prev.map(t => t.id === draggedTaskId ? { ...t, dueDate: newDate } : t));
      }
      setDraggedTaskId(null);
    }
  };

  const handleDropTaskCard = (e: React.DragEvent<HTMLDivElement>, targetTaskId: string) => {
    e.preventDefault();
    if (!isAdmin) return; // Workers cannot assign users

    if (draggedUserId) {
      e.stopPropagation();
      setTasks(prev => prev.map(t => {
        if (t.id === targetTaskId) {
          // Toggle user assignment
          const newAssignees = t.assigneeIds.includes(draggedUserId)
            ? t.assigneeIds // Already assigned, do nothing or could toggle off
            : [...t.assigneeIds, draggedUserId];
          return { ...t, assigneeIds: newAssignees };
        }
        return t;
      }));
      setDraggedUserId(null);
    }
  };

  const handleSaveTask = (updatedTask: Task) => {
    if (editingTask && editingTask.id) {
      setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    } else {
      setTasks(prev => [...prev, { ...updatedTask, id: Date.now().toString() }]);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setIsModalOpen(false);
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) return;
    const colors = ['bg-pink-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-red-500', 'bg-teal-500'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newUser: User = {
      id: Date.now().toString(),
      name: newUserName,
      avatar: newUserName.slice(0, 2), // First 2 chars
      color: randomColor
    };
    setUsers([...users, newUser]);
    setNewUserName('');
    setIsUserModalOpen(false);
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    // Remove from tasks
    setTasks(prev => prev.map(t => ({
      ...t,
      assigneeIds: t.assigneeIds.filter(id => id !== userId)
    })));
    if (filterUserId === userId) setFilterUserId(null);
  };

  const openNewTaskModal = () => {
    setEditingTask({
      id: '',
      title: '',
      dueDate: getTodayStr(),
      priority: 'Medium',
      status: 'Not Started',
      assigneeIds: [],
      memo: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask({ ...task });
    setIsModalOpen(true);
  };

  const toggleColumnSort = (columnId: ColumnType) => {
    setColumnSorts(prev => {
      const current = prev[columnId];
      let next: 'asc' | 'desc' | null;
      if (current === null) next = 'desc'; // High to Low
      else if (current === 'desc') next = 'asc'; // Low to High
      else next = null; // Reset
      return { ...prev, [columnId]: next };
    });
  };

  // --- Derived State ---

  const filteredTasks = useMemo(() => {
    return filterUserId ? tasks.filter(t => t.assigneeIds.includes(filterUserId)) : tasks;
  }, [tasks, filterUserId]);

  const columnsData = useMemo(() => {
    const cols: Record<ColumnType, Task[]> = { today: [], week: [], month: [], future: [], undecided: [] };
    filteredTasks.forEach(task => {
      const colId = getColumnForDate(task.dueDate);
      if (cols[colId]) cols[colId].push(task);
      else cols['undecided'].push(task);
    });

    // Apply column-specific sorting
    (Object.keys(cols) as ColumnType[]).forEach(colId => {
      const sortDir = columnSorts[colId];
      if (sortDir) {
        cols[colId].sort((a, b) => {
          const pMap = { High: 3, Medium: 2, Low: 1 };
          const valA = pMap[a.priority];
          const valB = pMap[b.priority];
          return sortDir === 'asc' ? valA - valB : valB - valA;
        });
      }
    });

    return cols;
  }, [filteredTasks, columnSorts]);

  const userStats = useMemo(() => {
    const totalTasks = tasks.length;
    return users.map(user => {
      const userTasks = tasks.filter(t => t.assigneeIds.includes(user.id));
      const completedTasks = userTasks.filter(t => t.status === 'Completed');
      const assignmentRate = totalTasks > 0 ? Math.round((userTasks.length / totalTasks) * 100) : 0;
      const completionRate = userTasks.length > 0 ? Math.round((completedTasks.length / userTasks.length) * 100) : 0;
      return { user, assignmentRate, completionRate, taskCount: userTasks.length };
    });
  }, [tasks, users]);

  const unassignedTasksCount = useMemo(() => tasks.filter(t => t.assigneeIds.length === 0).length, [tasks]);
  const overdueIncompleteTasksCount = useMemo(() => {
    const todayStr = getTodayStr();
    return tasks.filter(t => t.dueDate <= todayStr && t.status !== 'Completed').length;
  }, [tasks]);

  // Auto-hide alerts if conditions are resolved
  React.useEffect(() => {
    if (unassignedTasksCount === 0) setShowUnassignedAlert(false);
    if (overdueIncompleteTasksCount === 0) setShowOverdueAlert(false);
  }, [unassignedTasksCount, overdueIncompleteTasksCount]);

  if (!isLoggedIn) {
    return (
      <div className="flex h-screen bg-[#F4F6F9] items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-8">
          <div className="flex flex-col items-center mb-8">
            <CheckCircle2 className="w-12 h-12 text-indigo-600 mb-2" />
            <h1 className="text-2xl font-bold text-gray-800">Task Pro ログイン</h1>
            <p className="text-sm text-gray-500 mt-2 text-center">
              管理者: admin / admin<br/>
              作業員: user / user
            </p>
          </div>
          <div className="space-y-4">
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">ID <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${loginError && !loginId.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'}`}
                placeholder="IDを入力"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">パスワード <span className="text-red-500">*</span></label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 outline-none transition-all ${loginError && !loginPassword.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-200'}`}
                placeholder="パスワードを入力"
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button 
              onClick={handleLogin}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md font-bold transition-all mt-4"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F4F6F9] font-sans text-gray-800 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-40 bg-white border-r border-gray-200 flex flex-col shadow-sm z-30 shrink-0 transition-all duration-300">
        <div className="p-4 border-b border-gray-100 flex justify-center items-center">
          <div className="flex flex-col items-center gap-1">
            <CheckCircle2 className="w-8 h-8 text-indigo-600" />
            <span className="text-xs font-bold text-gray-800">Task Pro</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
              {isAdmin ? '管理者' : '作業員'}
            </span>
          </div>
        </div>
        
        <div className="p-3 flex-1 overflow-y-auto flex flex-col gap-6">
          {/* Description */}
          <div className="bg-indigo-50 p-2 rounded-lg text-[10px] text-indigo-800 leading-tight">
            <p className="font-bold mb-1">使い方</p>
            タスクをドラッグ＆ドロップで移動・管理できます。
          </div>

          <div>
            <div className="flex flex-col items-center justify-between mb-2 gap-2">
              <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider text-center">メンバー</h2>
              {isAdmin && (
                <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium p-1 hover:bg-indigo-50 rounded border border-indigo-100 w-full"
                >
                  追加
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 justify-items-center">
              {users.map(user => (
                <div key={user.id} className="relative group">
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStartUser(e, user.id)}
                    onClick={() => setFilterUserId(filterUserId === user.id ? null : user.id)}
                    className={`
                      relative w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold cursor-grab active:cursor-grabbing transition-all duration-200
                      ${user.color}
                      ${filterUserId === user.id ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'hover:opacity-80'}
                      ${filterUserId && filterUserId !== user.id ? 'opacity-40' : ''}
                    `}
                    title={user.name}
                  >
                    {user.avatar}
                    {filterUserId === user.id && (
                      <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5 border border-white">
                        <Filter className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                  {/* Delete User Button (visible on hover) */}
                  {isAdmin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteUser(user.id); }}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
                      title="削除"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto">
             <button 
              onClick={() => isAdmin && openNewTaskModal()}
              className={`w-full py-3 px-2 text-white rounded-xl shadow-md flex flex-col items-center justify-center gap-1 transition-colors ${isAdmin ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' : 'bg-gray-300 cursor-not-allowed'}`}
              title={isAdmin ? "新規タスク" : "権限がありません"}
              disabled={!isAdmin}
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-bold">作成</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-700">ボードビュー</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500 font-medium mr-4">
              全 {tasks.length} 件
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              ログアウト
            </button>
          </div>
        </header>

        {/* Stats Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex gap-6 flex-wrap">
            {userStats.map(stat => (
              <div key={stat.user.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2 pr-4 border border-gray-100 min-w-[200px]">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${stat.user.color}`}>
                  {stat.user.avatar}
                </div>
                <div className="flex flex-col gap-0.5 w-full">
                  <div className="text-xs font-bold text-gray-700 truncate">{stat.user.name}</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500">
                    <span title="全体に対する割当率" className="whitespace-nowrap">割当: <span className="font-semibold text-indigo-600">{stat.assignmentRate}%</span></span>
                    <span title="担当タスクの完遂率" className="whitespace-nowrap">完遂: <span className="font-semibold text-green-600">{stat.completionRate}%</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Board Columns */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 lg:p-6">
          <div className="flex h-full gap-4 lg:gap-6 min-w-[300px] sm:min-w-full lg:min-w-[1000px]">
            {COLUMNS.map(col => (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDropColumn(e, col.id)}
                className={`flex-1 flex flex-col rounded-2xl bg-gray-50/50 border-2 border-gray-300 min-w-[280px] max-w-[400px] transition-colors ${draggedTaskId ? 'bg-opacity-70 border-dashed border-indigo-300' : ''}`}
              >
                {/* Column Header */}
                <div className={`p-4 rounded-t-xl flex items-center justify-between ${col.headerBg}`}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-700">{col.title}</h3>
                    <button 
                      onClick={() => toggleColumnSort(col.id)}
                      className={`p-1 rounded hover:bg-black/5 transition-colors ${columnSorts[col.id] ? 'text-indigo-600 bg-indigo-50' : 'text-gray-400'}`}
                      title="優先度でソート"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="bg-white/60 px-2.5 py-0.5 rounded-full text-sm font-semibold text-gray-600 shadow-sm">
                    {columnsData[col.id].length}
                  </span>
                </div>

                {/* Column Body */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {columnsData[col.id].map(task => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      users={users}
                      isDragging={draggedTaskId === task.id}
                      isAdmin={isAdmin}
                      onDragStart={handleDragStartTask}
                      onDrop={handleDropTaskCard}
                      onClick={() => openEditModal(task)}
                    />
                  ))}
                  {columnsData[col.id].length === 0 && (
                    <div className="h-32 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                      タスクをドロップ
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Login Modal (Removed as it is now the initial screen) */}

      {/* Task Modal */}
      {isModalOpen && editingTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
              <h3 className="text-lg font-bold text-gray-800">
                {editingTask.id ? (isAdmin ? 'タスクを編集' : 'タスク詳細') : '新規タスク'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">タイトル</label>
                <input 
                  type="text" 
                  value={editingTask.title}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="タスク名を入力..."
                  disabled={!isAdmin}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">期限日</label>
                  <input 
                    type="date" 
                    value={editingTask.dueDate}
                    onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={!isAdmin}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">優先度</label>
                  <select 
                    value={editingTask.priority}
                    onChange={e => setEditingTask({...editingTask, priority: e.target.value as Priority})}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
                    disabled={!isAdmin}
                  >
                    <option value="High">高</option>
                    <option value="Medium">中</option>
                    <option value="Low">低</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">ステータス</label>
                <div className="flex gap-2 flex-wrap">
                  {(['Not Started', 'In Progress', 'Waiting for Review', 'Completed'] as Status[]).map(s => (
                    <button
                      key={s}
                      onClick={() => isAdmin && setEditingTask({...editingTask, status: s})}
                      disabled={!isAdmin}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        editingTask.status === s 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200' 
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      } ${!isAdmin ? 'cursor-default opacity-80' : ''}`}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">メモ</label>
                <textarea 
                  value={editingTask.memo || ''}
                  onChange={e => setEditingTask({...editingTask, memo: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-sm min-h-[80px] disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="詳細を入力..."
                  disabled={!isAdmin}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">担当者（複数選択可）</label>
                <div className="flex gap-2 flex-wrap">
                  {users.map(u => {
                    const isSelected = editingTask.assigneeIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          if (!isAdmin) return;
                          const newIds = isSelected 
                            ? editingTask.assigneeIds.filter(id => id !== u.id)
                            : [...editingTask.assigneeIds, u.id];
                          setEditingTask({...editingTask, assigneeIds: newIds});
                        }}
                        disabled={!isAdmin}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-all ${u.color} ${isSelected ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-40 hover:opacity-100'} ${!isAdmin ? 'cursor-default' : ''}`}
                        title={u.name}
                      >
                        {isSelected && <div className="absolute inset-0 bg-black/10 rounded-full" />}
                        {u.avatar}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between shrink-0">
              {editingTask.id && isAdmin && (
                <button 
                  onClick={() => handleDeleteTask(editingTask.id)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" /> 削除
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  {isAdmin ? 'キャンセル' : '閉じる'}
                </button>
                {isAdmin && (
                  <button 
                    onClick={() => handleSaveTask(editingTask)}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    保存
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">メンバー追加</h3>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <input 
                type="text" 
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                placeholder="名前を入力..."
                autoFocus
                onKeyDown={e => e.key === 'Enter' && handleAddUser()}
              />
            </div>
            <div className="p-4 bg-gray-50 flex justify-end gap-2">
              <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">キャンセル</button>
              <button onClick={handleAddUser} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">追加</button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Alerts */}
      {isAdmin && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {showUnassignedAlert && (
            <div className="bg-white border-l-4 border-orange-500 shadow-lg rounded-r-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300 max-w-sm">
              <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800">未割り当てタスク</h4>
                <p className="text-xs text-gray-600 mt-1">
                  担当者が設定されていないタスクが <span className="font-bold text-orange-600">{unassignedTasksCount}件</span> あります。
                </p>
              </div>
              <button onClick={() => setShowUnassignedAlert(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {showOverdueAlert && (
            <div className="bg-white border-l-4 border-red-500 shadow-lg rounded-r-lg p-4 flex items-start gap-3 animate-in slide-in-from-right duration-300 max-w-sm">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800">期限切れ・未完了タスク</h4>
                <p className="text-xs text-gray-600 mt-1">
                  期限を過ぎて完了していないタスクが <span className="font-bold text-red-600">{overdueIncompleteTasksCount}件</span> あります。
                </p>
              </div>
              <button onClick={() => setShowOverdueAlert(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

interface TaskCardProps {
  task: Task;
  users: User[];
  isDragging: boolean;
  isAdmin: boolean;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  users,
  isDragging,
  isAdmin,
  onDragStart, 
  onDrop,
  onClick 
}) => {
  const isExpired = isOverdue(task.dueDate) && task.status !== 'Completed';
  const assignees = users.filter(u => task.assigneeIds.includes(u.id));

  const priorityColors = {
    High: 'bg-red-100 text-red-700',
    Medium: 'bg-orange-100 text-orange-700',
    Low: 'bg-green-100 text-green-700'
  };

  const statusColors = {
    'Not Started': 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-600',
    'Waiting for Review': 'bg-amber-100 text-amber-600',
    'Completed': 'bg-emerald-100 text-emerald-600'
  };

  return (
    <div 
      draggable={isAdmin}
      onDragStart={(e) => isAdmin && onDragStart(e, task.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => isAdmin && onDrop(e, task.id)}
      onClick={onClick}
      className={`
        group relative bg-white p-4 rounded-xl shadow-sm border transition-all duration-200 
        ${isAdmin ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-1' : 'cursor-pointer hover:bg-gray-50'}
        ${isExpired ? 'border-red-300 bg-red-50/30' : 'border-transparent hover:border-gray-200'}
        ${isDragging ? 'opacity-40' : 'opacity-100'}
      `}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex gap-2 flex-wrap">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[task.status]}`}>
            {STATUS_LABELS[task.status]}
          </span>
          {isExpired && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500 text-white flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> 期限切れ
            </span>
          )}
        </div>
      </div>

      <h4 className="font-semibold text-gray-800 mb-3 leading-snug group-hover:text-indigo-700 transition-colors">
        {task.title}
      </h4>

      {task.memo && (
        <div className="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 line-clamp-3">
          {task.memo}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className={`flex items-center gap-1 ${isExpired ? 'text-red-500 font-medium' : ''}`}>
            <Calendar className="w-3.5 h-3.5" />
            {task.dueDate}
          </div>
        </div>

        <div className="flex -space-x-2 overflow-hidden pl-1">
          {assignees.length > 0 ? (
            assignees.map(user => (
              <div 
                key={user.id}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white ${user.color}`} 
                title={user.name}
              >
                {user.avatar}
              </div>
            ))
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border border-dashed border-gray-300 ring-2 ring-white">
              <UserIcon className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

