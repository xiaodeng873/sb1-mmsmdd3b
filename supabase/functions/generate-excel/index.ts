import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getMappingByType } from './lib/templateMapping.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PrescriptionData {
  床號: string;
  中文姓名: string;
  院友相片?: string;
  處方日期: string;
  藥物名稱: string;
  劑型: string;
  服用途徑: string;
  服用次數: string;
  服用份量: string;
  服用日數: string;
  藥物來源: string;
}

interface RequestBody {
  prescriptions: PrescriptionData[];
  templateType: 'medication' | 'schedule';
  useCustomTemplate?: boolean;
  customTemplateType?: 'waiting-list' | 'prescription' | 'medication-record';
  title?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prescriptions, templateType, useCustomTemplate, customTemplateType, title }: RequestBody = await req.json()

    if (!prescriptions || !Array.isArray(prescriptions)) {
      return new Response(
        JSON.stringify({ error: 'Invalid prescriptions data' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate content based on template type and custom template settings
    let excelContent: string;
    let filename: string;

    if (useCustomTemplate && customTemplateType) {
      // Use custom template mapping
      const mapping = getMappingByType(customTemplateType);
      if (mapping) {
        excelContent = generateCustomTemplateExcel(prescriptions, mapping, title);
        filename = `${mapping.name}_${new Date().toISOString().split('T')[0]}.csv`;
      } else {
        throw new Error('Invalid custom template type');
      }
    } else if (templateType === 'medication') {
      excelContent = generateMedicationExcel(prescriptions, title);
      filename = `個人備藥及給藥記錄_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      excelContent = generateScheduleExcel(prescriptions, title);
      filename = `候診記錄表_${new Date().toISOString().split('T')[0]}.csv`;
    }

    return new Response(excelContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    console.error('Error generating Excel:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateCustomTemplateExcel(prescriptions: PrescriptionData[], mapping: any, title?: string): string {
  // Add BOM for UTF-8 encoding
  let csvContent = '\uFEFF';
  
  // Add title if provided
  if (title) {
    csvContent += `"${title}"\n\n`;
  }
  
  // Add generation info
  csvContent += `"報表生成時間: ${new Date().toLocaleString('zh-TW')}"\n`;
  csvContent += `"總記錄數: ${prescriptions.length}"\n\n`;
  
  // Add headers based on mapping
  const headers = mapping.fields.map((field: any) => field.label);
  csvContent += headers.map((header: string) => `"${header}"`).join(',') + '\n';
  
  // Add data rows based on mapping
  prescriptions.forEach(prescription => {
    const row = mapping.fields.map((field: any) => {
      let value = '';
      
      // Map data based on field key
      switch (field.key) {
        case '床號':
          value = prescription.床號;
          break;
        case '中文姓名':
          value = prescription.中文姓名;
          break;
        case '院友相片':
          value = prescription.院友相片 ? '有照片' : '無照片';
          break;
        case '處方日期':
        case '執行日期':
          value = prescription.處方日期;
          break;
        case '藥物名稱':
          value = prescription.藥物名稱;
          break;
        case '劑型':
          value = prescription.劑型 || '';
          break;
        case '服用途徑':
          value = prescription.服用途徑 || '';
          break;
        case '服用次數':
          value = prescription.服用次數 || '';
          break;
        case '服用份量':
          value = prescription.服用份量 || '';
          break;
        case '服用日數':
          value = prescription.服用日數 || '';
          break;
        case '藥物來源':
          value = prescription.藥物來源;
          break;
        case '需要時':
          value = prescription.需要時 ? '是' : '否';
          break;
        case '執行時間':
          value = new Date().toTimeString().slice(0, 5);
          break;
        case '執行人員':
        case '醫生簽名':
        case '備註':
          value = '';
          break;
        default:
          value = field.defaultValue || '';
      }
      
      return `"${value}"`;
    });
    
    csvContent += row.join(',') + '\n';
  });
  
  return csvContent;
}

function generateMedicationExcel(prescriptions: PrescriptionData[], title?: string): string {
  const headers = [
    '床號',
    '中文姓名', 
    '院友相片',
    '處方日期',
    '藥物名稱',
    '劑型',
    '服用途徑',
    '服用次數',
    '服用份量',
    '服用日數',
    '藥物來源'
  ];

  // Add BOM for UTF-8 encoding
  let csvContent = '\uFEFF';
  
  // Add title if provided
  if (title) {
    csvContent += `"${title}"\n\n`;
  }
  
  // Add generation info
  csvContent += `"報表生成時間: ${new Date().toLocaleString('zh-TW')}"\n`;
  csvContent += `"總記錄數: ${prescriptions.length}"\n\n`;
  
  // Add headers
  csvContent += headers.map(header => `"${header}"`).join(',') + '\n';
  
  // Add data rows
  prescriptions.forEach(prescription => {
    const row = [
      prescription.床號,
      prescription.中文姓名,
      prescription.院友相片 ? '有照片' : '無照片',
      prescription.處方日期,
      prescription.藥物名稱,
      prescription.劑型 || '',
      prescription.服用途徑 || '',
      prescription.服用次數 || '',
      prescription.服用份量 || '',
      prescription.服用日數 || '',
      prescription.藥物來源
    ];
    
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  return csvContent;
}

function generateScheduleExcel(prescriptions: PrescriptionData[], title?: string): string {
  const headers = [
    '床號',
    '中文姓名',
    '性別',
    '身份證號碼',
    '出生日期',
    '看診原因',
    '症狀說明',
    '藥物敏感',
    '不良藥物反應',
    '備註'
  ];

  // Add BOM for UTF-8 encoding
  let csvContent = '\uFEFF';
  
  // Add title if provided
  if (title) {
    csvContent += `"${title}"\n\n`;
  }
  
  // Add generation info
  csvContent += `"報表生成時間: ${new Date().toLocaleString('zh-TW')}"\n`;
  csvContent += `"總記錄數: ${prescriptions.length}"\n\n`;
  
  // Add headers
  csvContent += headers.map(header => `"${header}"`).join(',') + '\n';
  
  // Add data rows (for schedule template, we'll use available data)
  prescriptions.forEach(prescription => {
    const row = [
      prescription.床號,
      prescription.中文姓名,
      '', // 性別 - 需要從院友資料獲取
      '', // 身份證號碼 - 需要從院友資料獲取
      '', // 出生日期 - 需要從院友資料獲取
      '', // 看診原因 - 空白供填寫
      '', // 症狀說明 - 空白供填寫
      '', // 藥物敏感 - 需要從院友資料獲取
      '', // 不良藥物反應 - 需要從院友資料獲取
      ''  // 備註 - 空白供填寫
    ];
    
    csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
  });
  
  return csvContent;
}