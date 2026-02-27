import React, { useState } from "react";
import { Resizable, ResizeCallbackData } from "react-resizable";
import "react-resizable/css/styles.css";

interface ResizableTitleProps {
  onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  onDoubleClick?: (e: React.MouseEvent) => void;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  [key: string]: any;
}

const ResizableTitle: React.FC<ResizableTitleProps> = (props) => {
  const { onResize, onDoubleClick, width, minWidth = 80, maxWidth, ...restProps } = props;

  if (!width || !onResize) {
    return <th {...restProps} />;
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick?.(e);
  };

  return (
    <Resizable
      width={width}
      height={0}
      minConstraints={[minWidth, 0]}
      maxConstraints={maxWidth ? [maxWidth, 0] : [Infinity, 0]}
      onResize={onResize}
      draggableOpts={{ enableUserSelectHack: false }}
    >
      <th 
        {...restProps} 
        onDoubleClick={handleDoubleClick}
        style={{ cursor: "pointer", userSelect: "none" }} 
      />
    </Resizable>
  );
};

export default ResizableTitle;
