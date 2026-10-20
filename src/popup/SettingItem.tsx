import React from 'react';

export interface SettingItemProps {
   value: boolean;
   setValue: React.Dispatch<React.SetStateAction<boolean>>;
   label: string;
   description?: string;
   id: string;
   badge?: string;
   icon?: React.ReactNode;
   disabled?: boolean;
   onChange?: () => void;
}

const SettingItem: React.FC<SettingItemProps> = ({
   label,
   description,
   value,
   setValue,
   id,
   badge,
   icon,
   disabled = false,
   onChange,
}) => {
   const handleToggle = () => {
      if (disabled) return;
      const nextValue = !value;
      chrome.storage.sync.set({ [id]: nextValue });
      setValue(nextValue);
      if (onChange) onChange();
   };

   return (
      <div
         className={`setting-item ${disabled ? 'disabled' : ''} ${value ? 'is-checked' : ''}`}
         onClick={handleToggle}
         role="switch"
         aria-checked={value}
         aria-disabled={disabled}
         tabIndex={disabled ? -1 : 0}
         onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
               e.preventDefault();
               handleToggle();
            }
         }}
      >
         <div className="setting-content">
            {icon && <div className="setting-icon">{icon}</div>}
            <div className="setting-text">
               <div className="setting-label-row">
                  <span className="setting-label">{label}</span>
                  {badge && <span className="setting-badge">{badge}</span>}
               </div>
               {description && <p className="setting-desc">{description}</p>}
            </div>
         </div>

         <div className={`switch-toggle ${value ? 'active' : ''}`} aria-hidden="true">
            <span className="switch-thumb" />
         </div>
      </div>
   );
};

export default SettingItem;
