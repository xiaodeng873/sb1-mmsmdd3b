import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Loader2, CheckCircle } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { getMedicationTimeColorClass } from '../utils/medicationTimeColors';

interface OCRModalProps {
  onClose: () => void;
  onResult: (data: any) => void;
}

interface OCRResult {
  院友姓名: string;
  處方日期: string;
  藥物名稱: string;
  藥物來源: string;
  劑型: string;
  服用途徑: string;
  服用份量: string;
  服用次數: string;
  服用日數: string;
  備註: string;
  總數: string;
  需要時: string;
  服用時間: string;
}

const OCRModal: React.FC<OCRModalProps> = ({ onClose, onResult }) => {
  const { patients, addPrescription } = usePatients();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [newMedicationTime, setNewMedicationTime] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片文件');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Process with OCR
    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setSuccess(null);
    
    try {
      // Process with N8N webhook
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('https://xiaodeng873.app.n8n.cloud/webhook/96e0f8fe-d873-4863-a579-09b6a18c0f78', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('N8N OCR Response:', result);
      
      // 處理JSON回傳資料
      const ocrData: OCRResult = {
        院友姓名: String(result.院友姓名 || result.patientName || ''),
        處方日期: String(result.處方日期 || result.prescriptionDate || new Date().toISOString().split('T')[0]),
        藥物名稱: String(result.藥物名稱 || result.medicationName || ''),
        藥物來源: String(result.藥物來源 || result.source || '樂善堂社區藥房'),
        劑型: String(result.劑型 || result.dosageForm || ''),
        服用途徑: String(result.服用途徑 || result.route || ''),
        服用份量: String(result.服用份量 || result.dosage || ''),
        服用次數: String(result.服用次數 || result.frequency || ''),
        服用日數: String(result.服用日數 || result.duration || result.validDays || ''),
        備註: String(result.備註 || result.notes || ''),
        總數: String(result.總數 || result.totalQuantity || ''),
        需要時: String(result.需要時 || result.prn || 'false'),
        服用時間: String(result.服用時間 || result.medicationTimes || '')
      };
      
      setOcrResult(ocrData);
      setIsProcessing(false);
      
    } catch (error) {
      console.error('OCR處理失敗:', error);
      setError(error instanceof Error ? error.message : 'OCR處理失敗，請重試');
      setIsProcessing(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setShowCamera(true);
      }
    } catch (error) {
      console.error('無法開啟攝影機:', error);
      alert('無法開啟攝影機，請檢查權限設定');
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
            processFile(file);
          }
        }, 'image/jpeg', 0.8);
      }
      
      // Stop camera
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setShowCamera(false);
    }
  };

  const findPatientByName = (name: string) => {
    // 先嘗試完全匹配中文姓名
    let patient = patients.find(p => p.中文姓名 === name);
    
    // 如果沒找到，嘗試部分匹配（去除空格）
    if (!patient) {
      const cleanName = name.replace(/\s+/g, '');
      patient = patients.find(p => p.中文姓名.replace(/\s+/g, '') === cleanName);
    }
    
    // 如果還沒找到，嘗試包含匹配
    if (!patient) {
      patient = patients.find(p => 
        p.中文姓名.includes(name) || name.includes(p.中文姓名)
      );
    }
    
    return patient;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrResult) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // 根據院友姓名找到對應的院友ID
      const patient = findPatientByName(ocrResult.院友姓名);
      
      if (!patient) {
        throw new Error(`找不到姓名為「${ocrResult.院友姓名}」的院友，請檢查姓名是否正確或先在院友記錄中新增此院友`);
      }

      console.log('Found patient:', patient);

      // 準備處方資料
      const prescriptionData = {
        院友id: patient.院友id,
        藥物來源: ocrResult.藥物來源,
        處方日期: ocrResult.處方日期,
        藥物名稱: ocrResult.藥物名稱,
        劑型: ocrResult.劑型,
        服用途徑: ocrResult.服用途徑,
        服用份量: ocrResult.服用份量,
        服用次數: ocrResult.服用次數,
        服用日數: ocrResult.服用日數,
        需要時: ocrResult.需要時 === 'true',
        服用時間: ocrResult.服用時間 ? ocrResult.服用時間.split(',').map(t => t.trim()).filter(t => t) : []
      };

      console.log('Prescription data to save:', prescriptionData);

      // 寫入資料庫
      await addPrescription(prescriptionData);
      
      console.log('Prescription saved successfully');
      setSuccess(`處方已成功新增至院友「${patient.中文姓名}」(床號: ${patient.床號})的記錄中`);
      
      // 3秒後自動關閉
      setTimeout(() => {
        onResult(prescriptionData);
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('儲存處方失敗:', error);
      setError(error instanceof Error ? error.message : '儲存處方失敗，請重試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof OCRResult, value: string) => {
    if (ocrResult) {
      setOcrResult({
        ...ocrResult,
        [field]: value
      });
    }
  };

  const addMedicationTimeOCR = () => {
    // 移除此函數，因為現在服用時間是字串
  };

  const removeMedicationTimeOCR = (index: number) => {
    // 移除此函數，因為現在服用時間是字串
  };

  // 將時間字串轉換為分鐘數以便排序
  const convertTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/^(\d{1,2})(?::(\d{2}))?([APN])$/);
    if (!match) return 0;
    
    let hour = parseInt(match[1]);
    const minute = parseInt(match[2] || '0');
    const period = match[3];
    
    if (period === 'A' && hour === 12) hour = 0;
    if (period === 'P' && hour !== 12) hour += 12;
    if (period === 'N') hour = 12;
    
    return hour * 60 + minute;
  };
  // 檢查院友姓名是否存在
  const getPatientValidation = () => {
    if (!ocrResult?.院友姓名) return null;
    
    const patient = findPatientByName(ocrResult.院友姓名);
    if (patient) {
      return {
        valid: true,
        message: `找到院友: ${patient.中文姓名} (床號: ${patient.床號})`,
        patient
      };
    } else {
      return {
        valid: false,
        message: `找不到姓名為「${ocrResult.院友姓名}」的院友`,
        patient: null
      };
    }
  };

  const patientValidation = getPatientValidation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">OCR 藥物標籤掃描</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {!showCamera && !previewUrl && (
            <>
              {/* Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-900 mb-2">拖放圖片到此處</p>
                <p className="text-sm text-gray-600 mb-4">或選擇以下操作</p>
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>上傳圖片</span>
                  </button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>
            </>
          )}

          {/* Camera View */}
          {showCamera && (
            <div className="space-y-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <div className="flex justify-center space-x-3">
                <button
                  onClick={capturePhoto}
                  className="btn-primary flex items-center space-x-2"
                >
                  <Camera className="h-4 w-4" />
                  <span>拍照</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* Preview and Processing */}
          {previewUrl && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <img
                  src={previewUrl}
                  alt="預覽"
                  className="w-full max-h-64 object-contain rounded"
                />
              </div>
              
              {isProcessing && (
                <div className="flex items-center justify-center space-x-2 py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="text-gray-600">正在處理圖片並擷取藥物資訊...</span>
                </div>
              )}
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 text-sm">
                    <strong>處理失敗:</strong> {error}
                  </p>
                  <button
                    onClick={() => {
                      setError(null);
                      setPreviewUrl(null);
                    }}
                    className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
                  >
                    重新嘗試
                  </button>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <p className="text-green-800 text-sm font-medium">處方新增成功！</p>
                  </div>
                  <p className="text-green-700 text-sm mt-1">{success}</p>
                </div>
              )}
              
              {!isProcessing && !error && !ocrResult && !success && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setPreviewUrl(null);
                      setShowCamera(false);
                    }}
                    className="btn-secondary flex-1"
                  >
                    重新拍照
                  </button>
                </div>
              )}
            </div>
          )}

          {/* OCR Result Form */}
          {ocrResult && !success && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm font-medium mb-2">OCR 處理完成！</p>
                <p className="text-green-700 text-sm">請檢查並修正以下資訊，確認無誤後點擊「確認並儲存」：</p>
              </div>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">院友姓名</label>
                    <input
                      type="text"
                      value={ocrResult.院友姓名}
                      onChange={(e) => handleInputChange('院友姓名', e.target.value)}
                      className={`form-input ${patientValidation?.valid === false ? 'border-red-300' : patientValidation?.valid === true ? 'border-green-300' : ''}`}
                      placeholder="請輸入院友姓名"
                      required
                    />
                    {patientValidation && (
                      <p className={`text-xs mt-1 ${patientValidation.valid ? 'text-green-600' : 'text-red-600'}`}>
                        {patientValidation.message}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="form-label">處方日期</label>
                    <input
                      type="date"
                      value={ocrResult.處方日期}
                      onChange={(e) => handleInputChange('處方日期', e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">藥物名稱</label>
                  <input
                    type="text"
                    value={ocrResult.藥物名稱}
                    onChange={(e) => handleInputChange('藥物名稱', e.target.value)}
                    className="form-input"
                    placeholder="請輸入藥物名稱"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">藥物來源</label>
                    <input
                      type="text"
                      value={ocrResult.藥物來源}
                      onChange={(e) => handleInputChange('藥物來源', e.target.value)}
                      className="form-input"
                      placeholder="如：樂善堂社區藥房"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">劑型</label>
                    <input
                      type="text"
                      value={ocrResult.劑型}
                      onChange={(e) => handleInputChange('劑型', e.target.value)}
                      className="form-input"
                      placeholder="如：片劑、膠囊、液體"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">服用途徑</label>
                    <input
                      list="ocr-route-options"
                      value={ocrResult.服用途徑}
                      onChange={(e) => handleInputChange('服用途徑', e.target.value)}
                      className="form-input"
                      placeholder="如：口服、外用"
                    />
                    <datalist id="ocr-route-options">
                      <option value="口服" />
                      <option value="外用" />
                    </datalist>
                  </div>
                  
                  <div>
                    <label className="form-label">服用份量</label>
                    <input
                      type="text"
                      value={ocrResult.服用份量}
                      onChange={(e) => handleInputChange('服用份量', e.target.value)}
                      className="form-input"
                      placeholder="如：1粒、5ml"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">服用次數</label>
                    <input
                      type="text"
                      value={ocrResult.服用次數}
                      onChange={(e) => handleInputChange('服用次數', e.target.value)}
                      className="form-input"
                      placeholder="如：每日3次、每8小時1次"
                    />
                  </div>
                  
                  <div>
                    <label className="form-label">服用日數</label>
                    <input
                      type="text"
                      value={ocrResult.服用日數}
                      onChange={(e) => handleInputChange('服用日數', e.target.value)}
                      className="form-input"
                      placeholder="如：7天、14天"
                    />
                  </div>

                  <div>
                    <label className="form-label">總數</label>
                    <input
                      type="text"
                      value={ocrResult.總數}
                      onChange={(e) => handleInputChange('總數', e.target.value)}
                      className="form-input"
                      placeholder="如：30粒、100ml"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={ocrResult.需要時 === 'true'}
                    onChange={(e) => handleInputChange('需要時', e.target.checked.toString())}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="form-label mb-0">需要時</label>
                </div>
                
                {/* 需要時藥物的說明 */}
                {ocrResult.需要時 === 'true' && (
                  <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
                    <div className="flex items-center space-x-1">
                      <span>ℹ️</span>
                      <span>此為「需要時」藥物，服用時間可由護理人員依院友需要決定</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="form-label">服用時間</label>
                  <input
                    type="text"
                    value={ocrResult.服用時間}
                    onChange={(e) => handleInputChange('服用時間', e.target.value)}
                    className="form-input"
                    placeholder="如：8A, 12N, 6P"
                  />
                </div>

                <div>
                  <label className="form-label">備註</label>
                  <textarea
                    value={ocrResult.備註}
                    onChange={(e) => handleInputChange('備註', e.target.value)}
                    className="form-input"
                    rows={3}
                    placeholder="其他備註資訊..."
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSaving || !patientValidation?.valid}
                    className="btn-primary flex-1 flex items-center justify-center space-x-2"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>儲存中...</span>
                      </>
                    ) : (
                      <span>確認並儲存至資料庫</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrResult(null);
                      setPreviewUrl(null);
                    }}
                    className="btn-secondary flex-1"
                    disabled={isSaving}
                  >
                    重新掃描
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Instructions */}
          {!ocrResult && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">拍照小貼士</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 確保藥物標籤清晰可見</li>
                <li>• 避免反光和陰影</li>
                <li>• 將標籤放在畫面中央</li>
                <li>• 確保文字清楚可讀</li>
              </ul>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default OCRModal;