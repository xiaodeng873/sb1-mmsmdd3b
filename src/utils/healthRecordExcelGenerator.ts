import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { getTemplatesMetadata } from '../lib/database';

export interface HealthRecordExportData {
  記錄id?: number;
  床號: string;
  中文姓名: string;
  記錄日期: string;
  記錄時間: string;
  記錄類型: '生命表徵' | '血糖控制' | '體重控制';
  血壓收縮壓?: number;
  血壓舒張壓?: number;
  脈搏?: number;
  體溫?: number;
  血含氧量?: number;
  呼吸頻率?: number;
  血糖值?: number;
  體重?: number;
  備註?: string;
  記錄人員?: string;
}

// 範本格式提取介面
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

// 工作表配置介面
interface SheetConfig {
  name: string;
  template: ExtractedTemplate;
  records: HealthRecordExportData[];
  recordType: '生命表徵' | '血糖控制' | '體重控制';
}

// 從範本文件提取格式
export const extractHealthRecordTemplateFormat = async (templateFile: File): Promise<ExtractedTemplate> => {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await templateFile.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('找不到工作表');
  }

  const extractedTemplate: ExtractedTemplate = {
    columnWidths: [],
    rowHeights: [],
    mergedCells: [],
    cellData: {}
  };

  // Extract column widths (A to P = 1 to 16)
  for (let col = 1; col <= 16; col++) {
    let width = worksheet.getColumn(col).width;
    if (width === null || width === undefined) width = 8.43;
    extractedTemplate.columnWidths.push(Math.round(width * 100) / 100);
  }

  // Extract row heights (1 to 50)
  for (let row = 1; row <= 50; row++) {
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

  // Extract cell data (A1:P50)
  for (let row = 1; row <= 50; row++) {
    for (let col = 1; col <= 16; col++) {
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

// 應用範本格式並填入健康記錄資料
export const applyHealthRecordTemplateFormat = (
  worksheet: ExcelJS.Worksheet,
  template: ExtractedTemplate,
  records: HealthRecordExportData[],
  recordType: '生命表徵' | '血糖控制' | '體重控制'
): void => {
  console.log(`=== 開始應用${recordType}範本格式 ===`);
  
  // Step 1: Set column widths
  template.columnWidths.forEach((width, idx) => {
    if (idx < 16) {
      worksheet.getColumn(idx + 1).width = width;
    }
  });

  // Step 2: Set row heights
  template.rowHeights.forEach((height, idx) => {
    if (idx < 50) {
      worksheet.getRow(idx + 1).height = height;
    }
  });

  // Step 3: Apply cell data (value, font, alignment, border, fill)
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
  });

  // Step 4: Merge cells
  template.mergedCells.forEach(merge => {
    try {
      worksheet.mergeCells(merge);
    } catch (e) {
      console.warn(`合併儲存格失敗: ${merge}`, e);
    }
  });

  // Step 5: Fill record data starting from row 10 (assuming header ends at row 9)
  records.forEach((record, index) => {
    const rowIndex = 4 + index;
  
    
    // B: 床號
    worksheet.getCell(`B${rowIndex}`).value = record.床號;
    
    // C: 中文姓名
    worksheet.getCell(`C${rowIndex}`).value = record.中文姓名;
    
    // D: 記錄日期
    worksheet.getCell(`D${rowIndex}`).value = new Date(record.記錄日期).toLocaleDateString('zh-TW');
    
    // E: 記錄時間
    worksheet.getCell(`E${rowIndex}`).value = record.記錄時間;
    
    // 根據記錄類型填入不同欄位
    if (recordType === '生命表徵') {
      // F: 血壓收縮壓
      worksheet.getCell(`F${rowIndex}`).value = record.血壓收縮壓 || '';
      
      // G: 血壓舒張壓
      worksheet.getCell(`G${rowIndex}`).value = record.血壓舒張壓 || '';
      
      // H: 脈搏
      worksheet.getCell(`H${rowIndex}`).value = record.脈搏 || '';
      
      // I: 體溫
      worksheet.getCell(`I${rowIndex}`).value = record.體溫 || '';
      
      // J: 血含氧量
      worksheet.getCell(`J${rowIndex}`).value = record.血含氧量 || '';
      
      // K: 呼吸頻率
      worksheet.getCell(`K${rowIndex}`).value = record.呼吸頻率 || '';
      
    } else if (recordType === '血糖控制') {
      // F: 血糖值
      worksheet.getCell(`F${rowIndex}`).value = record.血糖值 || '';
      
    } else if (recordType === '體重控制') {
      // F: 體重
      worksheet.getCell(`F${rowIndex}`).value = record.體重 || '';
    }
    
    // 最後兩欄：備註和記錄人員
    const lastCols = recordType === '生命表徵' ? ['L', 'M'] : ['G', 'H'];
    worksheet.getCell(`${lastCols[0]}${rowIndex}`).value = record.備註 || '';
    worksheet.getCell(`${lastCols[1]}${rowIndex}`).value = record.記錄人員 || '';
  });

  // Step 6: Copy print settings from template
  if (template.printSettings) {
    try {
      worksheet.pageSetup = { ...template.printSettings };
    } catch (error) {
      console.warn('複製列印設定失敗:', error);
    }
  }
  
  console.log(`=== ${recordType}範本格式應用完成 ===`);
};

// 創建健康記錄工作簿
export const createHealthRecordWorkbook = async (
  sheetsConfig: SheetConfig[]
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();

  for (const config of sheetsConfig) {
    console.log(`創建健康記錄工作表: ${config.name}`);
    const worksheet = workbook.addWorksheet(config.name);
    
    applyHealthRecordTemplateFormat(worksheet, config.template, config.records, config.recordType);
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
  console.log(`健康記錄 Excel 檔案 ${filename} 保存成功`);
};

// 匯出健康記錄到 Excel
export const exportHealthRecordsToExcel = async (
  records: HealthRecordExportData[],
  recordType: '生命表徵' | '血糖控制' | '體重控制',
  filename?: string
): Promise<void> => {
  try {
    // 從 Supabase 獲取對應的範本
    const templatesData = await getTemplatesMetadata();
    const templateTypeMap = {
      '生命表徵': 'vital-signs',
      '血糖控制': 'blood-sugar',
      '體重控制': 'weight-control'
    };
    
    const templateType = templateTypeMap[recordType];
    const template = templatesData.find(t => t.type === templateType);
    
    if (!template) {
      // 如果沒有範本，使用簡單匯出方式
      await exportHealthRecordsToExcelSimple(records, recordType, filename);
      return;
    }

    const extractedFormat = template.extracted_format;
    
    // 構建工作表配置
    const sheetsConfig: SheetConfig[] = [{
      name: `${recordType}記錄表`,
      template: extractedFormat,
      records: records,
      recordType: recordType
    }];
    
    // 決定檔案名稱
    const finalFilename = filename || `${recordType}記錄表_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    // 創建工作簿並匯出
    const workbook = await createHealthRecordWorkbook(sheetsConfig);
    await saveExcelFile(workbook, finalFilename);
    
  } catch (error) {
    console.error('匯出健康記錄失敗:', error);
    throw error;
  }
};

// 簡單的健康記錄匯出（當沒有範本時使用）
const exportHealthRecordsToExcelSimple = async (
  records: HealthRecordExportData[],
  recordType: '生命表徵' | '血糖控制' | '體重控制',
  filename?: string
): Promise<void> => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${recordType}記錄表`);

  // 根據記錄類型設定不同的表頭
  let headers: string[] = ['序號', '床號', '中文姓名', '記錄日期', '記錄時間'];
  
  if (recordType === '生命表徵') {
    headers = [...headers, '血壓收縮壓', '血壓舒張壓', '脈搏', '體溫', '血含氧量', '呼吸頻率', '備註', '記錄人員'];
  } else if (recordType === '血糖控制') {
    headers = [...headers, '血糖值', '備註', '記錄人員'];
  } else if (recordType === '體重控制') {
    headers = [...headers, '體重', '備註', '記錄人員'];
  }

  // 設定欄寬
  worksheet.columns = headers.map(() => ({ width: 12 }));

  // 標題
  worksheet.mergeCells(`A1:${String.fromCharCode(64 + headers.length)}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = `${recordType}觀察記錄表`;
  titleCell.font = { size: 16, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6F7FF' }
  };

  // 生成資訊
  worksheet.mergeCells(`A3:${String.fromCharCode(64 + headers.length)}3`);
  const infoCell = worksheet.getCell('A3');
  infoCell.value = `生成時間: ${new Date().toLocaleString('zh-TW')} | 總記錄數: ${records.length}`;
  infoCell.font = { size: 10, italic: true };
  infoCell.alignment = { horizontal: 'center' };

  // 表頭
  const headerRow = worksheet.getRow(5);
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
  records.forEach((record, index) => {
    const rowIndex = 6 + index;
    const row = worksheet.getRow(rowIndex);
    
    let values: any[] = [
      index + 1,
      record.床號,
      record.中文姓名,
      new Date(record.記錄日期).toLocaleDateString('zh-TW'),
      record.記錄時間
    ];
    
    if (recordType === '生命表徵') {
      values = [...values, 
        record.血壓收縮壓 || '',
        record.血壓舒張壓 || '',
        record.脈搏 || '',
        record.體溫 || '',
        record.血含氧量 || '',
        record.呼吸頻率 || '',
        record.備註 || '',
        record.記錄人員 || ''
      ];
    } else if (recordType === '血糖控制') {
      values = [...values, 
        record.血糖值 || '',
        record.備註 || '',
        record.記錄人員 || ''
      ];
    } else if (recordType === '體重控制') {
      values = [...values, 
        record.體重 || '',
        record.備註 || '',
        record.記錄人員 || ''
      ];
    }

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

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const finalFilename = filename || `${recordType}記錄表_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(blob, finalFilename);
  
  console.log(`${recordType}記錄表 Excel 檔案 ${finalFilename} 匯出成功`);
};