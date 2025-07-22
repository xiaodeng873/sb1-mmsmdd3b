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

// 模擬任務數據
let tasks: HealthTask[] = [];

// 任務模態框組件（簡化版）
class TaskModal {
  private modalElement: HTMLElement;
  private formElement: HTMLFormElement;
  private remarkSelect: HTMLSelectElement;

  constructor() {
    // 初始化模態框
    this.modalElement = document.createElement('div');
    this.modalElement.className = 'modal';
    
    // 創建表單
    this.formElement = document.createElement('form');
    this.formElement.innerHTML = `
      <label>任務標題: <input type="text" id="taskTitle" required></label><br>
      <label>任務描述: <textarea id="taskDescription"></textarea></label><br>
      <label>備註: 
        <select id="taskRemark" required>
          ${Object.values(TaskRemark).map(remark => `<option value="${remark}">${remark}</option>`).join('')}
        </select>
      </label><br>
      <label>到期日期: <input type="date" id="taskDueDate" required></label><br>
      <button type="submit">保存</button>
      <button type="button" onclick="this.closest('.modal').style.display='none'">取消</button>
    `;
    
    this.modalElement.appendChild(this.formElement);
    document.body.appendChild(this.modalElement);
    
    this.remarkSelect = this.formElement.querySelector('#taskRemark') as HTMLSelectElement;
    this.formElement.addEventListener('submit', this.handleSubmit.bind(this));
  }

  // 顯示模態框進行新增或編輯
  public open(task?: HealthTask): void {
    this.modalElement.style.display = 'block';
    
    if (task) {
      // 編輯模式
      (this.formElement.querySelector('#taskTitle') as HTMLInputElement).value = task.title;
      (this.formElement.querySelector('#taskDescription') as HTMLTextAreaElement).value = task.description;
      this.remarkSelect.value = task.remark;
      (this.formElement.querySelector('#taskDueDate') as HTMLInputElement).value = 
        task.dueDate.toISOString().split('T')[0];
    } else {
      // 新增模式
      this.formElement.reset();
    }
  }

  // 處理表單提交
  private handleSubmit(event: Event): void {
    event.preventDefault();
    
    const title = (this.formElement.querySelector('#taskTitle') as HTMLInputElement).value;
    const description = (this.formElement.querySelector('#taskDescription') as HTMLTextAreaElement).value;
    const remark = this.remarkSelect.value as TaskRemark;
    const dueDate = new Date((this.formElement.querySelector('#taskDueDate') as HTMLInputElement).value);
    
    const task: HealthTask = {
      id: tasks.length + 1,
      title,
      description,
      remark,
      dueDate,
      completed: false
    };
    
    tasks.push(task);
    this.displayTasks();
    this.modalElement.style.display = 'none';
  }

  // 顯示今日任務（包含備註標註）
  private displayTasks(): void {
    const todayTasksElement = document.getElementById('todayTasks');
    if (!todayTasksElement) return;

    todayTasksElement.innerHTML = '<h2>今日任務</h2><h3>監測任務</h3>';
    
    tasks
      .filter(task => {
        const today = new Date();
        return task.dueDate.toDateString() === today.toDateString() && !task.completed;
      })
      .forEach(task => {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.innerHTML = `
          ${task.title}
          <span class="task-remark">${task.remark}</span>
        `;
        todayTasksElement.appendChild(taskElement);
      });
  }
}

export default TaskModal;

// CSS 樣式（假設在外部 CSS 文件中）
/*
.task-item {
  position: relative;
  padding: 10px;
  border-bottom: 1px solid #ccc;
}

.task-remark {
  position: absolute;
  top: 5px;
  right: 5px;
  background-color: #f0f0f0;
  padding: 2px 5px;
  font-size: 0.8em;
  border-radius: 3px;
}
*/