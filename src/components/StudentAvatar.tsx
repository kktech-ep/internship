import React, { useRef, useState } from 'react';
import { Camera, CheckCircle2, Upload, User, Loader2 } from 'lucide-react';
import { Student } from '../types';

export function getStudentGender(name: string): 'male' | 'female' {
  const trimmed = (name || '').trim();
  if (
    trimmed.startsWith('นางสาว') || 
    trimmed.startsWith('น.ส.') || 
    trimmed.startsWith('นาง') ||
    trimmed.startsWith('Miss') ||
    trimmed.startsWith('Ms.')
  ) {
    return 'female';
  }
  return 'male';
}

/**
 * High-fidelity Male Vocational Student Silhouette SVG
 */
export const MaleSilhouette: React.FC<{ className?: string }> = ({ className = 'w-full h-full text-sky-800' }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-label="โครงร่างนักศึกษาชาย">
    {/* Head & Short Hair */}
    <path d="M50 14 C38 14 32 22 32 34 C32 44 38 52 50 52 C62 52 68 44 68 34 C68 22 62 14 50 14 Z" />
    <path d="M32 28 C30 35 34 38 34 38 C34 38 35 24 48 20 C58 17 65 22 66 26 C67 30 67 36 67 36 C67 36 71 31 68 24 C65 17 58 13 50 13 C40 13 34 19 32 28 Z" opacity="0.35" />
    {/* Neck */}
    <rect x="44" y="50" width="12" height="12" rx="2" />
    {/* Shoulders & Collared Uniform */}
    <path d="M18 84 C18 68 30 60 42 58 L46 68 L50 72 L54 68 L58 58 C70 60 82 68 82 84 C82 86 80 88 78 88 L22 88 C20 88 18 86 18 84 Z" />
    {/* Collar V-line */}
    <polygon points="46,58 50,70 54,58 50,62" fill="#ffffff" opacity="0.45" />
  </svg>
);

/**
 * High-fidelity Female Vocational Student Silhouette SVG
 */
export const FemaleSilhouette: React.FC<{ className?: string }> = ({ className = 'w-full h-full text-rose-800' }) => (
  <svg viewBox="0 0 100 100" fill="currentColor" className={className} aria-label="โครงร่างนักศึกษาหญิง">
    {/* Hair Volume */}
    <path d="M50 12 C34 12 26 22 26 38 C26 48 29 58 33 66 C34 68 37 68 38 65 C39 60 38 52 38 46 C38 34 42 22 50 22 C58 22 62 34 62 46 C62 52 61 60 62 65 C63 68 66 68 67 66 C71 58 74 48 74 38 C74 22 66 12 50 12 Z" opacity="0.85" />
    {/* Face */}
    <path d="M50 18 C40 18 35 25 35 36 C35 46 41 53 50 53 C59 53 65 46 65 36 C65 25 60 18 50 18 Z" />
    {/* Neck */}
    <rect x="45" y="51" width="10" height="11" rx="2" />
    {/* Shoulders & Uniform Blouse */}
    <path d="M22 84 C22 69 33 60 43 59 L46 69 L50 73 L54 69 L57 59 C67 60 78 69 78 84 C78 86 76 88 74 88 L26 88 C24 88 22 86 22 84 Z" />
    {/* Blouse V-neck */}
    <polygon points="46,59 50,71 54,59 50,63" fill="#ffffff" opacity="0.45" />
  </svg>
);

/**
 * Compress and scale down uploaded image for optimal browser performance and Firestore storage
 */
export function compressImageFile(file: File, maxDim = 400, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface StudentAvatarProps {
  student: Student;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showUploadButton?: boolean;
  showUploadLink?: boolean;
  onAvatarUpdated?: (dataUrl: string) => void;
  className?: string;
}

export const StudentAvatar: React.FC<StudentAvatarProps> = ({
  student,
  size = 'md',
  showUploadButton = true,
  showUploadLink = false,
  onAvatarUpdated,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [justUploaded, setJustUploaded] = useState(false);

  const gender = getStudentGender(student.name);

  // Size styling map
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20 sm:w-24 sm:h-24',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    try {
      setIsUploading(true);
      const dataUrl = await compressImageFile(file);
      setIsUploading(false);
      setJustUploaded(true);
      setTimeout(() => setJustUploaded(false), 3000);

      if (onAvatarUpdated) {
        onAvatarUpdated(dataUrl);
      }
    } catch (err) {
      setIsUploading(false);
      console.error('Error compressing and uploading avatar:', err);
    }
  };

  const triggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Avatar Container */}
      <div className="relative group">
        <div
          className={`${sizeMap[size]} rounded-2xl overflow-hidden border-2 shadow-sm transition-all duration-200 flex items-center justify-center ${
            student.avatarUrl
              ? 'border-sky-400 bg-white ring-2 ring-sky-100'
              : gender === 'female'
              ? 'border-rose-200 bg-gradient-to-b from-rose-50 to-rose-100/60'
              : 'border-sky-200 bg-gradient-to-b from-sky-50 to-sky-100/60'
          }`}
        >
          {student.avatarUrl ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-full h-full object-cover"
            />
          ) : gender === 'female' ? (
            <div className="w-full h-full p-1.5 flex items-center justify-center">
              <FemaleSilhouette className="w-full h-full text-rose-500/80 hover:text-rose-600 transition" />
            </div>
          ) : (
            <div className="w-full h-full p-1.5 flex items-center justify-center">
              <MaleSilhouette className="w-full h-full text-sky-600/80 hover:text-sky-700 transition" />
            </div>
          )}

          {/* Uploading Spinner Overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center text-white">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          )}
        </div>

        {/* Camera Quick Button Badge */}
        {showUploadButton && (
          <button
            type="button"
            onClick={triggerUpload}
            title={student.avatarUrl ? 'เปลี่ยนรูปภาพประจำตัว' : 'อัปโหลดรูปภาพประจำตัว'}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-md border-2 border-white transition transform hover:scale-110 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
          </button>
        )}

        {/* Upload success checkmark toast */}
        {justUploaded && (
          <span className="absolute -top-1 -right-1 p-1 rounded-full bg-emerald-500 text-white shadow-md border-2 border-white animate-bounce">
            <CheckCircle2 className="w-3 h-3" />
          </span>
        )}
      </div>

      {/* Optional Upload Action Link */}
      {showUploadLink && (
        <button
          type="button"
          onClick={triggerUpload}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 hover:underline cursor-pointer transition pt-0.5"
        >
          <Upload className="w-3 h-3 text-sky-600" />
          <span>{student.avatarUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
        </button>
      )}
    </div>
  );
};
