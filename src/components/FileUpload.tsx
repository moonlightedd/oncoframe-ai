import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';

interface FileUploadProps {
  onFile: (text: string, filename: string) => void;
  accept?: string;
  label: string;
  hint?: string;
  icon?: 'csv' | 'json';
}

export default function FileUpload({ onFile, accept = '.csv', label, hint, icon = 'csv' }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      onFile(reader.result as string, file.name);
    };
    reader.readAsText(file);
  };

  const Icon = icon === 'csv' ? Upload : FileText;

  return (
    <div
      className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      tabIndex={0}
      role="button"
      aria-label={label}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />
      <Icon className="w-10 h-10 text-teal-500 mx-auto mb-3" />
      <p className="text-navy-500 font-medium">{label}</p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
