import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getTemplatesMetadata } from '../lib/database';
import { 
  extractWaitingListTemplateFormat, 
  applyWaitingListTemplateFormat,
  type WaitingListExportData 
} from './waitingListExcelGenerator';
import { 
  extractPrescriptionTemplateFormat, 
  applyPrescriptionTemplateFormat,
  type PrescriptionExportData 
} from './prescriptionExcelGenerator';

// 合併匯出排程的候診表和處方箋
export const exportCombinedScheduleToExcel = async (schedule: any): Promise<void> => {
  try {
    console.log('開始合併匯出排程資料...');
    
    // 從 Supabase 獲取範本
    const templatesData = await getTemplatesMetadata();
    const waitingListTemplate = templatesData.find(t => t.type === 'waiting-list');
    const prescriptionTemplate = templatesData.find(t => t.type === 'prescription');
    
    // 創建工作簿
    const workbook = new ExcelJS.Workbook();
    
    // 準備候診記錄表資料
    const waitingListData: WaitingListExportData[] = schedule.院友列表.map((item: any) => ({
      床號: item.院友.床號,
      中文姓名: item.院友.中文姓名,
      英文姓名: item.院友.英文姓名,
      性別: item.院友.性別 || '',
      身份證號碼: item.院友.身份證號碼 || '',
      出生日期: item.院友.出生日期 ? new Date(item.院友.出生日期).toLocaleDateString('zh-TW') : '',
      看診原因: item.看診原因 || [],
      症狀說明: item.症狀說明 || '',
      藥物敏感: item.院友.藥物敏感 || [],
      不良藥物反應: item.院友.不良藥物反應 || [],
      備註: item.備註 || '',
      到診日期: schedule.到診日期
    }));
    
    // 創建候診記錄表工作表
    const waitingListWorksheet = workbook.addWorksheet('院友候診記錄表');
    
    if (waitingListTemplate && waitingListTemplate.extracted_format) {
      // 使用自訂範本
      applyWaitingListTemplateFormat(
        waitingListWorksheet, 
        waitingListTemplate.extracted_format, 
        waitingListData, 
        schedule.到診日期
      );
    } else {
      // 使用預設格式
      await createSimpleWaitingListWorksheet(waitingListWorksheet, waitingListData, schedule.到診日期);
    }
    
    // 準備處方箋資料（只包含有勾選「申訴不適」的院友）
    const prescriptionPatients = schedule.院友列表.filter((item: any) => 
      item.看診原因 && item.看診原因.includes('申訴不適')
    );
    
    let prescriptionCount = 0;
    
    if (prescriptionPatients.length > 0) {
      // 為每個需要處方箋的院友創建工作表
      for (const patient of prescriptionPatients) {
        const prescriptionData: PrescriptionExportData = {
          床號: patient.院友.床號,
          中文姓名: patient.院友.中文姓名,
          性別: patient.院友.性別 || '',
          身份證號碼: patient.院友.身份證號碼 || '',
          出生日期: patient.院友.出生日期 || '',
          藥物敏感: patient.院友.藥物敏感 || [],
          不良藥物反應: patient.院友.不良藥物反應 || [],
          處方日期: schedule.到診日期,
          藥物名稱: '', // 空白供填寫
          劑型: '',
          服用途徑: '',
          服用次數: '',
          服用份量: '',
          服用日數: '',
          藥物來源: '',
          需要時: false,
          醫生簽名: ''
        };
        
        // 創建處方箋工作表
        const prescriptionWorksheetName = `${patient.院友.床號}_${patient.院友.中文姓名}_處方箋`;
        const prescriptionWorksheet = workbook.addWorksheet(prescriptionWorksheetName);
        
        if (prescriptionTemplate && prescriptionTemplate.extracted_format) {
          // 使用自訂範本
          applyPrescriptionTemplateFormat(
            prescriptionWorksheet, 
            prescriptionTemplate.extracted_format, 
            prescriptionData
          );
        } else {
          // 使用預設格式
          await createSimplePrescriptionWorksheet(prescriptionWorksheet, prescriptionData);
        }
        
        prescriptionCount++;
      }
    }
    
    // 決定檔案名稱
    const visitDate = new Date(schedule.到診日期).toLocaleDateString('zh-TW');
    const filename = `到診資料_${schedule.到診日期}.xlsx`;
    
    // 儲存檔案
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
    
    // 顯示完成訊息
    const message = prescriptionCount > 0 
      ? `匯出完成！\n✅ 候診記錄表：${schedule.院友列表.length} 位院友\n✅ 處方箋：${prescriptionCount} 位院友（申訴不適）\n📁 檔案：${filename}`
      : `匯出完成！\n✅ 候診記錄表：${schedule.院友列表.length} 位院友\n⚠️ 無院友需要處方箋（無申訴不適）\n📁 檔案：${filename}`;
    
    alert(message);
    
    console.log('合併匯出完成');
    
  } catch (error) {
    console.error('合併匯出失敗:', error);
    throw error;
  }
};

// 創建簡單的候診記錄表工作表（當沒有範本時使用）
const createSimpleWaitingListWorksheet = async (
  worksheet: ExcelJS.Worksheet,
  patients: WaitingListExportData[],
  visitDate: string
): Promise<void> => {
  // 設定欄寬
  worksheet.columns = [
    { width: 8 },  // 床號
    { width: 12 }, // 中文姓名
    { width: 15 }, // 英文姓名
    { width: 6 },  // 性別
    { width: 12 }, // 身份證號碼
    { width: 12 }, // 出生日期
    { width: 15 }, // 看診原因
    { width: 20 }, // 症狀說明
    { width: 15 }, // 藥物敏感
    { width: 15 }, // 不良藥物反應
    { width: 20 }, // 備註
  ];

  // 標題
  worksheet.mergeCells('A1:K1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `院友候診記錄表 - ${new Date(visitDate).toLocaleDateString('zh-TW')}`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F7FF' }
  };

  // 表頭
  const headers = [
    '床號', '中文姓名', '英文姓名', '性別', '身份證號碼', '出生日期',
    '看診原因', '症狀說明', '藥物敏感', '不良藥物反應', '備註'
  ];

  const headerRow = worksheet.getRow(3);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF70AD47' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 資料行
  patients.forEach((patient, index) => {
    const rowIndex = 4 + index;
    const row = worksheet.getRow(rowIndex);
    
    const values = [
      patient.床號,
      patient.中文姓名,
      patient.英文姓名 || '',
      patient.性別,
      patient.身份證號碼,
      patient.出生日期,
      Array.isArray(patient.看診原因) ? patient.看診原因.join(', ') : (patient.看診原因 || ''),
      patient.症狀說明 || '',
      Array.isArray(patient.藥物敏感) ? (patient.藥物敏感.length ? patient.藥物敏感.join(', ') : '無') : (patient.藥物敏感 || '無'),
      Array.isArray(patient.不良藥物反應) ? (patient.不良藥物反應.length ? patient.不良藥物反應.join(', ') : '無') : (patient.不良藥物反應 || '無'),
      patient.備註 || ''
    ];

    values.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = value;
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // 交替行顏色
      if (index % 2 === 1) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8F9FA' }
        };
      }
    });
  });
};

// 創建簡單的處方箋工作表（當沒有範本時使用）
const createSimplePrescriptionWorksheet = async (
  worksheet: ExcelJS.Worksheet,
  prescription: PrescriptionExportData
): Promise<void> => {
  // 設定欄寬
  worksheet.columns = [
    { width: 10 }, // 床號
    { width: 15 }, // 中文姓名
    { width: 12 }, // 處方日期
    { width: 20 }, // 藥物名稱
    { width: 10 }, // 劑型
    { width: 10 }, // 服用途徑
    { width: 12 }, // 服用次數
    { width: 12 }, // 服用份量
    { width: 10 }, // 服用日數
    { width: 15 }, // 藥物來源
    { width: 8 },  // 需要時
    { width: 12 }  // 醫生簽名
  ];

  // 標題
  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `VMO處方箋 - ${prescription.中文姓名} (${prescription.床號})`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F3FF' }
  };

  // 院友資訊
  worksheet.getCell('A3').value = '院友姓名:';
  worksheet.getCell('B3').value = prescription.中文姓名;
  worksheet.getCell('D3').value = '性別:';
  worksheet.getCell('E3').value = prescription.性別;
  worksheet.getCell('G3').value = '身份證號碼:';
  worksheet.getCell('H3').value = prescription.身份證號碼;
  worksheet.getCell('J3').value = '出生日期:';
  worksheet.getCell('K3').value = prescription.出生日期;

  // 藥物敏感資訊
  worksheet.getCell('A4').value = '藥物敏感:';
  const allergies = Array.isArray(prescription.藥物敏感) 
    ? (prescription.藥物敏感.length ? prescription.藥物敏感.join(', ') : 'NKDA')
    : (prescription.藥物敏感 || 'NKDA');
  worksheet.getCell('B4').value = allergies;

  // 不良藥物反應
  worksheet.getCell('A5').value = '不良藥物反應:';
  const reactions = Array.isArray(prescription.不良藥物反應)
    ? (prescription.不良藥物反應.length ? prescription.不良藥物反應.join(', ') : 'NKADR')
    : (prescription.不良藥物反應 || 'NKADR');
  worksheet.getCell('B5').value = reactions;

  // 表頭
  const headers = [
    '床號', '中文姓名', '處方日期', '藥物名稱', '劑型', '服用途徑',
    '服用次數', '服用份量', '服用日數', '藥物來源', '需要時', '醫生簽名'
  ];

  const headerRow = worksheet.getRow(7);
  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // 空白資料行供填寫
  for (let i = 0; i < 10; i++) {
    const rowIndex = 8 + i;
    const row = worksheet.getRow(rowIndex);
    
    const values = [
      prescription.床號,
      prescription.中文姓名,
      prescription.處方日期,
      '', // 藥物名稱 - 空白供填寫
      '', // 劑型
      '', // 服用途徑
      '', // 服用次數
      '', // 服用份量
      '', // 服用日數
      '', // 藥物來源
      '', // 需要時
      ''  // 醫生簽名
    ];

    values.forEach((value, colIndex) => {
      const cell = row.getCell(colIndex + 1);
      cell.value = value;
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
  }
};