// 院友相關的輔助函數

// 計算居住期
export const calculateResidencyPeriod = (admissionDate?: string, dischargeDate?: string): string => {
  if (!admissionDate) {
    return '未設定入住日期';
  }

  const admission = new Date(admissionDate);
  const discharge = dischargeDate ? new Date(dischargeDate) : new Date();
  
  if (admission > discharge) {
    return '日期錯誤';
  }

  const diffTime = discharge.getTime() - admission.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 30) {
    return `${diffDays} 天`;
  }
  
  const diffMonths = Math.floor(diffDays / 30);
  const remainingDays = diffDays % 30;
  
  if (diffMonths < 12) {
    return remainingDays > 0 ? `${diffMonths} 個月 ${remainingDays} 天` : `${diffMonths} 個月`;
  }
  
  const diffYears = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  
  let result = `${diffYears} 年`;
  if (remainingMonths > 0) {
    result += ` ${remainingMonths} 個月`;
  }
  if (remainingDays > 0) {
    result += ` ${remainingDays} 天`;
  }
  
  return result;
};

// 格式化社會福利顯示
export const formatSocialWelfare = (socialWelfare?: { 主要類型?: string; 子類型?: string }): string => {
  if (!socialWelfare?.主要類型) {
    return '無';
  }
  
  if (socialWelfare.主要類型 === '公共福利金計劃' && socialWelfare.子類型) {
    return `${socialWelfare.主要類型} - ${socialWelfare.子類型}`;
  }
  
  return socialWelfare.主要類型;
};

// 獲取護理等級顏色
export const getNursingLevelColor = (level?: string): string => {
  switch (level) {
    case '全護理': return 'bg-red-100 text-red-800';
    case '半護理': return 'bg-yellow-100 text-yellow-800';
    case '自理': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// 獲取入住類型顏色
export const getAdmissionTypeColor = (type?: string): string => {
  switch (type) {
    case '私位': return 'bg-blue-100 text-blue-800';
    case '買位': return 'bg-purple-100 text-purple-800';
    case '院舍卷': return 'bg-green-100 text-green-800';
    case '暫住': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// 獲取在住狀態顏色
export const getResidencyStatusColor = (status?: string): string => {
  switch (status) {
    case '在住': return 'bg-green-100 text-green-800';
    case '已退住': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};