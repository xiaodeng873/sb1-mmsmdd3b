import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// 定義備註的枚舉類型
enum TaskRemark {
  BeforeMedication = "服藥前",
  BeforeInjection = "注射前",
  Regular = "定期",
  SpecialCare = "特別關顧"
}

// 任務的接口
interface HealthTask {
  id: number;
  title: string;
  description: string;
  remark: TaskRemark;
  dueDate: Date;
  completed: boolean;
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: HealthTask;
  onSave: (task: Omit<HealthTask, 'id' | 'completed'>) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [remark, setRemark] = useState<TaskRemark>(TaskRemark.Regular);
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (task) {
      // 編輯模式
      setTitle(task.title);
      setDescription(task.description);
      setRemark(task.remark);
      setDueDate(task.dueDate.toISOString().split('T')[0]);
    } else {
      // 新增模式
      setTitle('');
      setDescription('');
      setRemark(TaskRemark.Regular);
      setDueDate('');
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskData = {
      title,
      description,
      remark,
      dueDate: new Date(dueDate)
    };
    
    onSave(taskData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            {task ? '編輯任務' : '新增任務'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任務標題
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              任務描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
            </label>
            <select
              value={remark}
              onChange={(e) => setRemark(e.target.value as TaskRemark)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.values(TaskRemark).map(remarkOption => (
                <option key={remarkOption} value={remarkOption}>
                  {remarkOption}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              到期日期
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
export type { HealthTask, TaskRemark };