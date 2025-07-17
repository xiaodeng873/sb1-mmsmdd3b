// 範本映射配置
export interface TemplateMapping {
  type: 'waiting-list' | 'prescription' | 'medication-record';
  name: string;
  fields: TemplateField[];
}

export interface TemplateField {
  key: string;
  label: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  defaultValue?: any;
}

// 院友候診記錄表映射
export const waitingListMapping: TemplateMapping = {
  type: 'waiting-list',
  name: '院友候診記錄表',
  fields: [
    { key: '床號', label: '床號', required: true, type: 'string' },
    { key: '中文姓名', label: '中文姓名', required: true, type: 'string' },
    { key: '英文姓名', label: '英文姓名', required: false, type: 'string' },
    { key: '性別', label: '性別', required: true, type: 'string' },
    { key: '身份證號碼', label: '身份證號碼', required: true, type: 'string' },
    { key: '出生日期', label: '出生日期', required: true, type: 'date' },
    { key: '看診原因', label: '看診原因', required: false, type: 'string' },
    { key: '症狀說明', label: '症狀說明', required: false, type: 'string' },
    { key: '藥物敏感', label: '藥物敏感', required: false, type: 'string', defaultValue: '無' },
    { key: '不良藥物反應', label: '不良藥物反應', required: false, type: 'string', defaultValue: '無' },
    { key: '備註', label: '備註', required: false, type: 'string' },
    { key: '到診日期', label: '到診日期', required: true, type: 'date' }
  ]
};

// VMO處方箋映射
export const prescriptionMapping: TemplateMapping = {
  type: 'prescription',
  name: 'VMO處方箋',
  fields: [
    { key: '床號', label: '床號', required: true, type: 'string' },
    { key: '中文姓名', label: '中文姓名', required: true, type: 'string' },
    { key: '處方日期', label: '處方日期', required: true, type: 'date' },
    { key: '藥物名稱', label: '藥物名稱', required: true, type: 'string' },
    { key: '劑型', label: '劑型', required: false, type: 'string' },
    { key: '服用途徑', label: '服用途徑', required: false, type: 'string' },
    { key: '服用次數', label: '服用次數', required: false, type: 'string' },
    { key: '服用份量', label: '服用份量', required: false, type: 'string' },
    { key: '服用日數', label: '服用日數', required: false, type: 'string' },
    { key: '藥物來源', label: '藥物來源', required: true, type: 'string' },
    { key: '需要時', label: '需要時', required: false, type: 'boolean', defaultValue: false },
    { key: '醫生簽名', label: '醫生簽名', required: false, type: 'string' }
  ]
};

// 個人備藥及給藥記錄映射
export const medicationRecordMapping: TemplateMapping = {
  type: 'medication-record',
  name: '個人備藥及給藥記錄',
  fields: [
    { key: '床號', label: '床號', required: true, type: 'string' },
    { key: '中文姓名', label: '中文姓名', required: true, type: 'string' },
    { key: '院友相片', label: '院友相片', required: false, type: 'string' },
    { key: '藥物名稱', label: '藥物名稱', required: true, type: 'string' },
    { key: '劑型', label: '劑型', required: false, type: 'string' },
    { key: '服用途徑', label: '服用途徑', required: false, type: 'string' },
    { key: '服用次數', label: '服用次數', required: false, type: 'string' },
    { key: '服用份量', label: '服用份量', required: false, type: 'string' },
    { key: '服用日數', label: '服用日數', required: false, type: 'string' },
    { key: '藥物來源', label: '藥物來源', required: true, type: 'string' },
    { key: '需要時', label: '需要時', required: false, type: 'boolean', defaultValue: false },
    { key: '執行日期', label: '執行日期', required: false, type: 'date' },
    { key: '執行時間', label: '執行時間', required: false, type: 'string' },
    { key: '執行人員', label: '執行人員', required: false, type: 'string' },
    { key: '備註', label: '備註', required: false, type: 'string' }
  ]
};

// 獲取所有映射
export const getAllMappings = (): TemplateMapping[] => {
  return [waitingListMapping, prescriptionMapping, medicationRecordMapping];
};

// 根據類型獲取映射
export const getMappingByType = (type: string): TemplateMapping | null => {
  const mappings = getAllMappings();
  return mappings.find(m => m.type === type) || null;
};

// 驗證數據是否符合映射要求
export const validateDataAgainstMapping = (data: any[], mapping: TemplateMapping): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  data.forEach((row, index) => {
    mapping.fields.forEach(field => {
      if (field.required && (!row[field.key] || row[field.key] === '')) {
        errors.push(`第 ${index + 1} 行：${field.label} 為必填欄位`);
      }
      
      // 類型驗證
      if (row[field.key] && field.type === 'number' && isNaN(Number(row[field.key]))) {
        errors.push(`第 ${index + 1} 行：${field.label} 必須為數字`);
      }
      
      if (row[field.key] && field.type === 'date' && isNaN(Date.parse(row[field.key]))) {
        errors.push(`第 ${index + 1} 行：${field.label} 必須為有效日期格式`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// 根據映射轉換數據
export const transformDataByMapping = (data: any[], mapping: TemplateMapping): any[] => {
  return data.map(row => {
    const transformedRow: any = {};
    
    mapping.fields.forEach(field => {
      let value = row[field.key];
      
      // 應用預設值
      if (!value && field.defaultValue !== undefined) {
        value = field.defaultValue;
      }
      
      // 類型轉換
      if (value) {
        switch (field.type) {
          case 'number':
            value = Number(value);
            break;
          case 'boolean':
            value = Boolean(value) && value !== 'false' && value !== '否';
            break;
          case 'date':
            if (typeof value === 'string') {
              const date = new Date(value);
              value = isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
            }
            break;
        }
      }
      
      transformedRow[field.key] = value;
    });
    
    return transformedRow;
  });
};

// 生成範本CSV內容
export const generateTemplateCSV = (mapping: TemplateMapping, sampleData?: any[]): string => {
  const headers = mapping.fields.map(field => field.label);
  let csvContent = `\uFEFF"${mapping.name}"\n`;
  csvContent += `"生成日期: ${new Date().toLocaleDateString('zh-TW')}"\n\n`;
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';
  
  // 如果有範例資料，加入範例
  if (sampleData && sampleData.length > 0) {
    sampleData.forEach(row => {
      const values = mapping.fields.map(field => {
        const value = row[field.key] || field.defaultValue || '';
        return `"${value}"`;
      });
      csvContent += values.join(',') + '\n';
    });
  }
  
  return csvContent;
};