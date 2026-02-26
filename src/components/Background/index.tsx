import React from 'react';
import './styles.less';

const Background: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="background-container">
      {children}
    </div>
  );
};

export default Background;
