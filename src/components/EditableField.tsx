import React, { useState, useEffect, useRef } from 'react';

interface EditableFieldProps {
  wrapDisplay?: boolean;
  initialValue: string;
  onSave: (value: string) => void;
  className?: string;
  isTextArea?: boolean;
  disabled?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({ initialValue, onSave, className = '', isTextArea = false, disabled = false, wrapDisplay = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if(inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleBlur = () => {
    onSave(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isTextArea) {
      handleBlur();
    } else if (e.key === 'Escape') {
      setValue(initialValue);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      className: `bg-white border border-blue-400 rounded-md p-1 w-full ${(wrapDisplay ? 'whitespace-normal break-words' : '')} ${className}`,
    };
    return isTextArea ? <textarea {...commonProps} rows={3} /> : <input type="text" {...commonProps} />;
  }

  return (
    <div onClick={() => !disabled && setIsEditing(true)} className={`${disabled ? 'cursor-default' : 'cursor-pointer hover:bg-slate-200'} p-1 rounded-md w-full ${wrapDisplay ? 'whitespace-normal break-words' : 'truncate'} ${className}`}>
      {value || <span className="text-slate-400">{disabled ? '' : 'Klik for at redigere'}</span>}
    </div>
  );
};






