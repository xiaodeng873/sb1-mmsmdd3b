import React, { useState } from 'react';
import { X, User, Upload, Camera, Trash2 } from 'lucide-react';
import { usePatients } from '../context/PatientContext';
import { createDefaultTasks } from '../utils/taskScheduler';

interface PatientModalProps {
  patient?: any;
  onClose: () => void;
}

const PatientModal: React.FC<PatientModalProps> = ({ patient, onClose }) => {
  const [formData, setFormData] = useState({
    床號: patient?.床號 || '',
    中文姓名: patient?.中文姓名 || '',
    英文姓名: patient?.英文姓名 || '',
    性別: patient?.性別 || '男',
    身份證號碼: patient?.身份證號碼 || '',
    藥物敏感: patient?.藥物敏感 || [],
    不良藥物反應: patient?.不良藥物反應 || [],
    感染控制: patient?.感染控制 || [],
    出生日期: patient?.出生日期 || '',
    院友相片: patient?.院友相片 || ''
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(patient?.院友相片 || null);
  const [isUploading, setIsUploading] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');
  const [newAdverseReaction, setNewAdverseReaction] = useState('');
  const [newInfectionControl, setNewInfectionControl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const addAllergy = () => {
    if (newAllergy.trim()) {
      setFormData(prev => ({
        ...prev,
        藥物敏感: [...prev.藥物敏感, newAllergy.trim()]
      }));
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData(prev => ({
      ...prev,
      藥物敏感: prev.藥物敏感.filter((_, i) => i !== index)
    }));
  };

  const addAdverseReaction = () => {
    if (newAdverseReaction.trim()) {
      setFormData(prev => ({
        ...prev,
        不良藥物反應: [...prev.不良藥物反應, newAdverseReaction.trim()]
      }));
      setNewAdverseReaction('');
    }
  };

  const removeAdverseReaction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      不良藥物反應: prev.不良藥物反應.filter((_, i) => i !== index)
    }));
  };

  const addInfectionControl = () => {
    if (newInfectionControl.trim()) {
      setFormData(prev => ({
        ...prev,
        感染控制: [...prev.感染控制, newInfectionControl.trim()]
      }));
      setNewInfectionControl('');
    }
  };

  const removeInfectionControl = (index: number) => {
    setFormData(prev => ({
      ...prev,
      感染控制: prev.感染控制.filter((_, i) => i !== index)
    }));
  };
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片文件');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('圖片大小不能超過 5MB');
      return;
    }

    setIsUploading(true);
    
    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64String = e.target?.result as string;
        setPhotoPreview(base64String);
        setFormData(prev => ({
          ...prev,
          院友相片: base64String
        }));
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('上傳照片失敗:', error);
      alert('上傳照片失敗，請重試');
      setIsUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePhotoUpload(e.target.files[0]);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setFormData(prev => ({
      ...prev,
      院友相片: ''
    }));
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      
      // Create a simple camera capture modal
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-md w-full">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">拍攝院友照片</h3>
            <button id="close-camera" class="text-gray-400 hover:text-gray-600">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="space-y-4">
            <div id="video-container" class="w-full h-64 bg-gray-100 rounded-lg overflow-hidden"></div>
            <div class="flex space-x-3">
              <button id="capture-btn" class="btn-primary flex-1">拍照</button>
              <button id="cancel-btn" class="btn-secondary flex-1">取消</button>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.getElementById('video-container')?.appendChild(video);
      
      const closeCamera = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(modal);
      };
      
      document.getElementById('close-camera')?.addEventListener('click', closeCamera);
      document.getElementById('cancel-btn')?.addEventListener('click', closeCamera);
      
      document.getElementById('capture-btn')?.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const dataURL = canvas.toDataURL('image/jpeg', 0.8);
          
          setPhotoPreview(dataURL);
          setFormData(prev => ({
            ...prev,
            院友相片: dataURL
          }));
        }
        
        closeCamera();
      });
      
    } catch (error) {
      console.error('無法開啟攝影機:', error);
      alert('無法開啟攝影機，請檢查權限設定');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (patient) {
      updatePatient({
        院友id: patient.院友id,
        ...formData
      });
    } else {
      addPatient(formData);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {patient ? '編輯院友' : '新增院友'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Photo Upload Section */}
          <div>
            <label className="form-label">院友照片</label>
            <div className="flex items-center space-x-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="院友照片" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="flex flex-col space-y-2">
                <label className="btn-secondary cursor-pointer flex items-center space-x-2">
                  <Upload className="h-4 w-4" />
                  <span>上傳照片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>移除照片</span>
                  </button>
                )}
              </div>
            </div>
            {isUploading && (
              <p className="text-sm text-blue-600 mt-2">上傳中...</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">床號</label>
              <input
                type="text"
                name="床號"
                value={formData.床號}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">性別</label>
              <select
                name="性別"
                value={formData.性別}
                onChange={handleChange}
                className="form-input"
                required
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">中文姓名</label>
            <input
              type="text"
              name="中文姓名"
              value={formData.中文姓名}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">英文姓名</label>
            <input
              type="text"
              name="英文姓名"
              value={formData.英文姓名}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">身份證號碼</label>
              <input
                type="text"
                name="身份證號碼"
                value={formData.身份證號碼}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div>
              <label className="form-label">出生日期</label>
              <input
                type="date"
                name="出生日期"
                value={formData.出生日期}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          <div>
            <label className="form-label">藥物敏感</label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className="form-input flex-1"
                  placeholder="輸入藥物敏感項目"
                  onKeyPress={(e) => e.key === 'Enter' && addAllergy()}
                />
                <button
                  type="button"
                  onClick={addAllergy}
                  className="btn-secondary"
                >
                  新增
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.藥物敏感.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                  >
                    {allergy}
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      className="ml-2 text-orange-600 hover:text-orange-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.藥物敏感.length === 0 && (
                  <span className="text-sm text-gray-500">無藥物敏感</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">不良藥物反應</label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newAdverseReaction}
                  onChange={(e) => setNewAdverseReaction(e.target.value)}
                  className="form-input flex-1"
                  placeholder="輸入不良藥物反應項目"
                  onKeyPress={(e) => e.key === 'Enter' && addAdverseReaction()}
                />
                <button
                  type="button"
                  onClick={addAdverseReaction}
                  className="btn-secondary"
                >
                  新增
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.不良藥物反應.map((reaction, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                  >
                    {reaction}
                    <button
                      type="button"
                      onClick={() => removeAdverseReaction(index)}
                      className="ml-2 text-red-600 hover:text-red-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.不良藥物反應.length === 0 && (
                  <span className="text-sm text-gray-500">無不良藥物反應</span>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="form-label">感染控制</label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newInfectionControl}
                  onChange={(e) => setNewInfectionControl(e.target.value)}
                  className="form-input flex-1"
                  placeholder="輸入感染控制項目"
                  onKeyPress={(e) => e.key === 'Enter' && addInfectionControl()}
                />
                <button
                  type="button"
                  onClick={addInfectionControl}
                  className="btn-secondary"
                >
                  新增
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.感染控制.map((control, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800"
                  >
                    {control}
                    <button
                      type="button"
                      onClick={() => removeInfectionControl(index)}
                      className="ml-2 text-purple-600 hover:text-purple-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {formData.感染控制.length === 0 && (
                  <span className="text-sm text-gray-500">無感染控制項目</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="btn-primary flex-1"
            >
              {patient ? '更新院友' : '新增院友'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;