import React from 'react';

interface TabSwitcherProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

/**
 * TabSwitcher - A base component to wrap Ant Design Tabs with a consistent style.
 * It provides a subtle bottom border and standard spacing.
 */
const TabSwitcher: React.FC<TabSwitcherProps> = ({ children, style, className }) => {
  return (
    <div 
      className={`tab-switcher-container ${className || ''}`}
      style={{ 
        marginBottom: 0,
        ...style 
      }}
    >
      {children}
    </div>
  );
};

export default TabSwitcher;
