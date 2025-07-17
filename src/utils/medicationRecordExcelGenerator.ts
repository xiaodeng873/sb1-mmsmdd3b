import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getTemplatesMetadata } from '../lib/database';

// 專注於個人備藥及給藥記錄的範本格式
interface ExtractedTemplate {
  columnWidths: number[];
  rowHeights: number[];
  mergedCells: string[];
  printSettings?: Partial<ExcelJS.PageSetup>;
  cellData: {
    [address: string]: {
      value?: any;
      font?: Partial<ExcelJS.Font>;
      alignment?: Partial<ExcelJS.Alignment>;
      border?: Partial<ExcelJS.Borders>;
      fill?: Partial<ExcelJS.Fill>;
      numFmt?: string;
    };
  };
}

interface SheetConfig {
  name: string;
  template: ExtractedTemplate;
  patient: any;
  prescriptions: any[];
}

// 輔助函數：解析儲存格地址
function parseCellAddress(address: string): { row: number; col: number } {
  const match = address.match(/([A-Z]+)(\d+)/i);
  if (!match) throw new Error('Invalid cell address: ' + address);
  const colLetters = match[1].toUpperCase();
  const row = parseInt(match[2], 10);
  let col = 0;
  for (let i = 0; i < colLetters.length; i++) {
    col = col * 26 + (colLetters.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
  }
  return { row, col };
}

// 輔助函數：轉換行列號為儲存格地址
function getCellAddress(row: number, col: number): string {
  let colStr = '';
  while (col > 0) {
    col--;
    colStr = String.fromCharCode(65 + (col % 26)) + colStr;
    col = Math.floor(col / 26);
  }
  return colStr + row;
}

// 從指定工作表提取範本格式（僅用於個人備藥及給藥記錄）
export const extractTemplateFormat = async (templateFile: File, sheetName?: string): Promise<ExtractedTemplate> => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await templateFile.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  let worksheet: ExcelJS.Worksheet;
  
  if (sheetName) {
    worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`找不到工作表: ${sheetName}`);
    }
  } else {
    worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new Error('找不到工作表');
    }
  }

  const extractedTemplate: ExtractedTemplate = {
    columnWidths: [],
    rowHeights: [],
    mergedCells: [],
    cellData: {}
  };

  // Extract column widths (up to column AR = 44)
  for (let col = 1; col <= 44; col++) {
    let width = worksheet.getColumn(col).width;
    if (width === null || width === undefined) width = 8.43;
    extractedTemplate.columnWidths.push(Math.round(width * 100) / 100);
  }

  // Extract row heights (up to row 37)
  for (let row = 1; row <= 37; row++) {
    let height = worksheet.getRow(row).height;
    if (height === null || height === undefined) height = 15;
    extractedTemplate.rowHeights.push(Math.round(height * 100) / 100);
  }

  // Extract merged cells
  if (worksheet.model && worksheet.model.merges) {
    worksheet.model.merges.forEach(merge => {
      extractedTemplate.mergedCells.push(merge);
    });
  }
  
  // Extract print settings
  if (worksheet.pageSetup) {
    extractedTemplate.printSettings = { ...worksheet.pageSetup };
  }

  // Extract cell data (A1:AR37)
  for (let row = 1; row <= 37; row++) {
    for (let col = 1; col <= 44; col++) {
      const cell = worksheet.getCell(row, col);
      const address = cell.address;
      
      const cellData: any = {};
      
      // Extract value
      if (cell.value !== null && cell.value !== undefined && cell.value !== '') {
        cellData.value = cell.value;
      }
      
      // Extract font
      if (cell.font) {
        cellData.font = { ...cell.font };
      }
      
      // Extract alignment
      if (cell.alignment) {
        cellData.alignment = { ...cell.alignment };
      }
      
      // Extract border
      if (cell.border) {
        cellData.border = {
          top: cell.border.top ? { ...cell.border.top } : undefined,
          left: cell.border.left ? { ...cell.border.left } : undefined,
          bottom: cell.border.bottom ? { ...cell.border.bottom } : undefined,
          right: cell.border.right ? { ...cell.border.right } : undefined,
          diagonal: cell.border.diagonal ? { ...cell.border.diagonal } : undefined,
          diagonalUp: cell.border.diagonalUp,
          diagonalDown: cell.border.diagonalDown
        };
      }
      
      // Extract fill
      if (cell.fill) {
        cellData.fill = { ...cell.fill };
      }
      
      // Extract number format
      if (cell.numFmt) {
        cellData.numFmt = cell.numFmt;
      }
      
      // Only store cell data if it has any properties
      if (Object.keys(cellData).length > 0) {
        extractedTemplate.cellData[address] = cellData;
      }
    }
  }

  return extractedTemplate;
};

// 應用範本格式並填入院友和處方資料
export const applyTemplateFormat = (
  worksheet: ExcelJS.Worksheet,
  template: ExtractedTemplate,
  patient: any,
  prescriptions: any[]
): void => {
  console.log('=== 開始按照正確順序應用範本格式 ===');
  
  // Step 1: Set column widths
  console.log('第1步: 設定欄寬...');
  template.columnWidths.forEach((width, idx) => {
    if (idx < 44) {
      worksheet.getColumn(idx + 1).width = width;
    }
  });

  // Step 2: Set row heights
  console.log('第2步: 設定列高...');
  template.rowHeights.forEach((height, idx) => {
    if (idx < 37) {
      worksheet.getRow(idx + 1).height = height;
    }
  });

  // Step 3: Apply cell data (value, font, alignment, border, fill)
  console.log('第3步: 複製單元格格式和內容...');
  let copiedCells = 0;
  Object.entries(template.cellData).forEach(([address, cellData]) => {
    const cell = worksheet.getCell(address);
    
    // Apply value
    if (cellData.value !== undefined) {
      cell.value = cellData.value;
    }
    
    // Apply font
    if (cellData.font) {
      cell.font = { ...cellData.font };
    }
    
    // Apply alignment
    if (cellData.alignment) {
      cell.alignment = { ...cellData.alignment };
    }
    
    // Apply border
    if (cellData.border) {
      cell.border = { ...cellData.border };
    }
    
    // Apply fill
    if (cellData.fill) {
      cell.fill = { ...cellData.fill };
    }
    
    // Apply number format
    if (cellData.numFmt) {
      cell.numFmt = cellData.numFmt;
    }
    
    copiedCells++;
  });
  console.log(`複製了 ${copiedCells} 個單元格的格式`);

  // Step 4: Merge cells
  console.log('第4步: 合併儲存格...');
  let mergedCount = 0;
  template.mergedCells.forEach(merge => {
    try {
      worksheet.mergeCells(merge);
      mergedCount++;
    } catch (e) {
      console.warn(`合併儲存格失敗: ${merge}`, e);
    }
  });
  console.log(`合併了 ${mergedCount} 個儲存格`);

  // Step 4.5: Fix borders for merged cells
  console.log('第4.5步: 修復合併儲存格的邊框...');
  const mergedCellsToFix = [
    'B12:J12', 'AF1:AJ1', 'AO1:AQ1', 'J13:K13', 'J18:K18', 'J23:K23', 'J28:K28'
  ];
  
  mergedCellsToFix.forEach(range => {
    try {
      const [startCell, endCell] = range.split(':');
      const startPos = parseCellAddress(startCell);
      const endPos = parseCellAddress(endCell);
      
      // Get border style from the first cell in the range
      const firstCell = worksheet.getCell(startCell);
      const borderStyle = firstCell.border;
      
      if (borderStyle) {
        // Apply border to all cells in the merged range
        for (let row = startPos.row; row <= endPos.row; row++) {
          for (let col = startPos.col; col <= endPos.col; col++) {
            const cell = worksheet.getCell(row, col);
            cell.border = { ...borderStyle };
          }
        }
      }
    } catch (e) {
      console.warn(`修復合併儲存格邊框失敗: ${range}`, e);
    }
  });

  // Step 5: Fill patient header data
  console.log('第5步: 填充院友表頭資料...');
  if (patient) {
    // 藥物過敏: B1
    const allergies = Array.isArray(patient.藥物敏感) 
      ? (patient.藥物敏感.length ? patient.藥物敏感.join(', ') : 'NKDA')
      : (patient.藥物敏感 || 'NKDA');
    worksheet.getCell('B1').value = allergies;
    
    // 不良藥物反應: B3
    const reactions = Array.isArray(patient.不良藥物反應)
      ? (patient.不良藥物反應.length ? patient.不良藥物反應.join(', ') : 'NKADR')
      : (patient.不良藥物反應 || 'NKADR');
    worksheet.getCell('B3').value = reactions;

    // 顯示處方年月 (K3)
if (prescriptions.length > 0 && prescriptions[0].處方日期) {
  try {
    const rawDate = prescriptions[0].處方日期;
    const dateObj = new Date(rawDate);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      worksheet.getCell('K3').value = `${year}-${month}`;
      console.log(`已填入處方年月至K3: ${year}-${month}`);
    } else {
      console.warn('無效的處方日期格式:', rawDate);
    }
  } catch (error) {
    console.warn('轉換處方日期失敗:', error);
  }
}

    // 院友中文姓名: AF1
    worksheet.getCell('AF1').value = patient.中文姓名 || '';
    
    // 性別/年齡: AF2
    if (patient.性別 && patient.出生日期) {
      const birth = new Date(patient.出生日期);
      const age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      worksheet.getCell('AF2').value = `${patient.性別}/${age}歲`;
    }
    
    // 床號: AO1
    worksheet.getCell('AO1').value = patient.床號 || '';
    
    // 出生日期: AO2
    worksheet.getCell('AO2').value = patient.出生日期 || '';
  }

  // Step 6: Fill prescription data (up to 5 prescriptions)
  console.log('第6步: 填充處方資料...');
  const maxPrescriptions = Math.min(prescriptions.length, 5);
  
  for (let i = 0; i < maxPrescriptions; i++) {
    const prescription = prescriptions[i];
    const startRow = 7 + (i * 5); // 7, 12, 17, 22, 27
    
    console.log(`填充第 ${i + 1} 筆處方資料，起始行: ${startRow}`);
    
    // 處方日期: A(startRow), A(startRow+2)
    worksheet.getCell(`A${startRow}`).value = prescription.處方日期 || '';
    worksheet.getCell(`A${startRow + 2}`).value = prescription.處方日期 || '';
    
    // 藥物名稱: B(startRow)
    worksheet.getCell(`B${startRow}`).value = prescription.藥物名稱 || '';
    
    // 藥物來源: B(startRow+4) with prefix
    const medicationSource = prescription.藥物來源 || '';
    worksheet.getCell(`B${startRow + 4}`).value = medicationSource ? `藥物來源：${medicationSource}` : '';
    
    // 劑型: J(startRow)
    worksheet.getCell(`J${startRow}`).value = prescription.劑型 || '';
    
    // 服用途徑: J(startRow+1)
    worksheet.getCell(`J${startRow + 1}`).value = prescription.服用途徑 || '';
    
    // 服用次數: J(startRow+2)
    worksheet.getCell(`J${startRow + 2}`).value = prescription.服用次數 || '';
    
    // 服用份量: J(startRow+3)
    worksheet.getCell(`J${startRow + 3}`).value = prescription.服用份量 || '';
    
    // 需要時: J(startRow+4)
    worksheet.getCell(`J${startRow + 4}`).value = prescription.需要時 ? '需要時' : '';
    
    // 服用時間: L(startRow+1) 到 L(startRow+4) (L8-L11, L13-L16, L18-L21, L23-L26, L28-L31)
    if (prescription.服用時間 && Array.isArray(prescription.服用時間)) {
      // 將時間分為上午和下午時段
      const morningTimes: string[] = [];
      const afternoonTimes: string[] = [];
      
      prescription.服用時間.forEach(time => {
        const timeInMinutes = convertTimeToMinutes(time);
        // 上午時段: 7A-12N (420-720分鐘)
        if (timeInMinutes >= 420 && timeInMinutes <= 720) {
          morningTimes.push(time);
        }
        // 下午時段: 1P-10P (780-1320分鐘)
        else if (timeInMinutes >= 780 && timeInMinutes <= 1320) {
          afternoonTimes.push(time);
        }
      });
      
      // 分別排序上午和下午時段
      morningTimes.sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b));
      afternoonTimes.sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b));
      
      // 填充上午時段時間 (最多2個)
      for (let j = 0; j < Math.min(morningTimes.length, 2); j++) {
        worksheet.getCell(`L${startRow + j + 1}`).value = morningTimes[j];
        console.log(`填充上午時段服用時間到 L${startRow + j + 1}: ${morningTimes[j]}`);
      }
      
      // 填充下午時段時間 (最多2個)
      for (let j = 0; j < Math.min(afternoonTimes.length, 2); j++) {
        worksheet.getCell(`L${startRow + j + 3}`).value = afternoonTimes[j];
        console.log(`填充下午時段服用時間到 L${startRow + j + 3}: ${afternoonTimes[j]}`);
      }
    }
  }
  
  // Debug borders after step 6
  debugBorders(worksheet, '第6步後');

  // Step 7: Fill consolidated medication times (L32-37)
  console.log('第7步: 填充合併服用時間 (L32-37)...');
  const allTimes = prescriptions.flatMap(p => p.服用時間 || []);
  const uniqueTimes = Array.from(new Set(allTimes));
  
  // 將時間分為上午和下午時段
  const morningTimes: string[] = [];
  const afternoonTimes: string[] = [];
  
  uniqueTimes.forEach(time => {
    const timeInMinutes = convertTimeToMinutes(time);
    // 上午時段: 7A-12N (420-720分鐘)
    if (timeInMinutes >= 420 && timeInMinutes <= 720) {
      morningTimes.push(time);
    }
    // 下午時段: 1P-10P (780-1320分鐘)
    else if (timeInMinutes >= 780 && timeInMinutes <= 1320) {
      afternoonTimes.push(time);
    }
  });
  
  // 分別排序上午和下午時段
  morningTimes.sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b));
  afternoonTimes.sort((a, b) => convertTimeToMinutes(a) - convertTimeToMinutes(b));
  
  // 填充 L32-34 (上午時段，最多3個)
  for (let i = 0; i < Math.min(morningTimes.length, 3); i++) {
    worksheet.getCell(`L${32 + i}`).value = morningTimes[i];
  }
  
  // 填充 L35-37 (下午時段，最多3個)
  for (let i = 0; i < Math.min(afternoonTimes.length, 3); i++) {
    worksheet.getCell(`L${35 + i}`).value = afternoonTimes[i];
  }

  console.log(`填充上午時段 (L32-34): ${morningTimes.slice(0, 3).join(', ')}`);
  console.log(`填充下午時段 (L35-37): ${afternoonTimes.slice(0, 3).join(', ')}`);

  // Debug borders after step 7
  debugBorders(worksheet, '第7步後');

  // Step 8: Copy print settings from template
  console.log('第8步: 複製列印設定...');
  if (template.printSettings) {
    try {
      worksheet.pageSetup = { ...template.printSettings };
      console.log('列印設定複製成功');
    } catch (error) {
      console.warn('複製列印設定失敗:', error);
    }
  }
  
  // Debug borders after step 8
  debugBorders(worksheet, '第8步後');

  console.log('=== 範本格式應用完成 ===');

  // Step 9: Apply hardcoded borders to specific ranges
  console.log('第9步: 硬編碼設定指定範圍的邊框...');
  const borderRanges = [
    'B1:J2', 'AF1:AJ1', 'AO1:AQ1','J8:K8','J13:K13', 'J18:K18', 'J23:K23', 'J28:K28',
    'N5:AR6', 'H32:K37', 'A32:G37'
  ];
  
  const borderStyle = {
    top: { style: 'thin', color: { argb: 'FF000000' } },
    left: { style: 'thin', color: { argb: 'FF000000' } },
    bottom: { style: 'thin', color: { argb: 'FF000000' } },
    right: { style: 'thin', color: { argb: 'FF000000' } }
  };
  
  let processedRanges = 0;
  borderRanges.forEach(range => {
    try {
      const [startCell, endCell] = range.split(':');
      const startPos = parseCellAddress(startCell);
      const endPos = parseCellAddress(endCell);
      
      for (let row = startPos.row; row <= endPos.row; row++) {
        for (let col = startPos.col; col <= endPos.col; col++) {
          const cell = worksheet.getCell(row, col);
          cell.border = borderStyle;
        }
      }
      processedRanges++;
      console.log(`✅ 已設定範圍 ${range} 的邊框`);
    } catch (error) {
      console.warn(`❌ 設定範圍 ${range} 邊框失敗:`, error);
    }
  });
  
  console.log(`硬編碼邊框設定完成，處理了 ${processedRanges} 個範圍`);
  
  // Step 9.5: Add double bottom borders to specific rows
  console.log('第9.5步: 設定雙線底邊框...');
  const doubleBorderRows = [
    { row: 4, range: 'A4:AR4' },
    { row: 31, range: 'A31:AR31' }
  ];
  
  const doubleBorderStyle = {
    style: 'double',
    color: { argb: 'FF000000' }
  };
  
  let doubleBorderCells = 0;
  doubleBorderRows.forEach(({ row, range }) => {
    try {
      // A=1 to AR=44
      for (let col = 1; col <= 44; col++) {
        const cell = worksheet.getCell(row, col);
        // Preserve existing borders but set bottom to double
        const existingBorder = cell.border || {};
        cell.border = {
          ...existingBorder,
          bottom: doubleBorderStyle
        };
        doubleBorderCells++;
      }
      console.log(`✅ 已設定範圍 ${range} 的雙線底邊框`);
    } catch (error) {
      console.warn(`❌ 設定範圍 ${range} 雙線底邊框失敗:`, error);
    }
  });
  
  console.log(`雙線底邊框設定完成，處理了 ${doubleBorderCells} 個單元格`);
  
  console.log('=== 範本格式應用完成 ===');
};

// 除錯函數：檢查邊框
const debugBorders = (worksheet: ExcelJS.Worksheet, step: string) => {
  console.log(`=== ${step} 邊框檢查 ===`);
  
  const checkRanges = [
    'B1:J2', 'AF1:AJ1', 'AO1:AQ1', 'J13:K13', 'J18:K18', 'J23:K23', 'J28:K28',
    'N5:AR6', 'H32:K37', 'A32:G37'
  ];
  
  checkRanges.forEach(range => {
    const [startCell, endCell] = range.split(':');
    const startPos = parseCellAddress(startCell);
    const endPos = parseCellAddress(endCell);
    
    let hasBorder = false;
    for (let row = startPos.row; row <= endPos.row; row++) {
      for (let col = startPos.col; col <= endPos.col; col++) {
        const cell = worksheet.getCell(row, col);
        if (cell.border && (cell.border.top || cell.border.left || cell.border.bottom || cell.border.right)) {
          hasBorder = true;
          break;
        }
      }
      if (hasBorder) break;
    }
    
    console.log(`${range}: ${hasBorder ? '有邊框' : '無邊框'}`);
  });
};

// 輔助函數：將時間字串轉換為分鐘數以便排序
const convertTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
  if (!match) return 0;
  
  let hour = parseInt(match[1]);
  const minute = parseInt(match[2] || '0');
  const period = match[3];
  
  // Handle special cases
  if (period === 'A' && hour === 12) hour = 0; // 12A = 00:xx
  if (period === 'P' && hour !== 12) hour += 12; // xP = (x+12):xx (except 12P)
  if (period === 'N') hour = 12; // 12N = 12:xx
  
  return hour * 60 + minute;
};

// 創建包含多個工作表的工作簿（專用於個人備藥及給藥記錄）
export const createWorkbook = async (sheetsConfig: SheetConfig[]): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();

  for (const config of sheetsConfig) {
    console.log(`創建工作表: ${config.name}`);
    const worksheet = workbook.addWorksheet(config.name);
    
    applyTemplateFormat(worksheet, config.template, config.patient, config.prescriptions);
  }

  return workbook;
};

// 儲存 Excel 檔案
export const saveExcelFile = async (
  workbook: ExcelJS.Workbook,
  filename: string
): Promise<void> => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename);
  console.log(`Excel 檔案 ${filename} 保存成功`);
};

// 匯出個人備藥及給藥記錄到 Excel
export const exportMedicationRecordToExcel = async (
  sheetsConfig: SheetConfig[],
  filename: string
): Promise<void> => {
  try {
    const workbook = await createWorkbook(sheetsConfig);
    await saveExcelFile(workbook, filename);
  } catch (error) {
    console.error('匯出個人備藥及給藥記錄失敗:', error);
    throw error;
  }
};

// 新增從 Supabase 獲取範本的輔助函數
export const getMedicationTemplatesFromSupabase = async (): Promise<{
  oralTemplate?: any;
  topicalTemplate?: any;
}> => {
  try {
    const templatesData = await getTemplatesMetadata();
    
    const oralTemplate = templatesData.find(t => 
      t.type === 'medication-record' && t.name.includes('口服')
    );
    
    const topicalTemplate = templatesData.find(t => 
      t.type === 'medication-record' && t.name.includes('外用')
    );
    
    return {
      oralTemplate: oralTemplate?.extracted_format,
      topicalTemplate: topicalTemplate?.extracted_format
    };
  } catch (error) {
    console.error('從 Supabase 獲取藥物範本失敗:', error);
    return {};
  }
};