import React, { useState, useEffect, useRef } from 'react';
import '../styles/MapMaker.css';

interface MapMakerProps {
  mapUrl: string;
  onBack: () => void;
}

interface ScalePoint {
  x: number;
  y: number;
}

function MapMaker({ mapUrl, onBack }: MapMakerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  
  // Scale tool states
  const [activeToolName, setActiveToolName] = useState<string | null>(null);
  const [scalePoints, setScalePoints] = useState<ScalePoint[]>([]);
  const [scaleDistance, setScaleDistance] = useState<number>(10);
  const [scaleDistanceOption, setScaleDistanceOption] = useState<string>("10");
  const [customScaleDistance, setCustomScaleDistance] = useState<string>("10");
  const [isSettingScale, setIsSettingScale] = useState<boolean>(false);
  const [mapScale, setMapScale] = useState<number | null>(null);
  const [draggingPointIndex, setDraggingPointIndex] = useState<number | null>(null);
  const [isDraggingMap, setIsDraggingMap] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
  const [isToolExpanded, setIsToolExpanded] = useState<boolean>(false);

  // Center the map and make it fill the container when it loads
  useEffect(() => {
    const centerAndFitMap = () => {
      if (mapImageRef.current && mapContentRef.current && mapWrapperRef.current) {
        const mapContent = mapContentRef.current;
        const mapImage = mapImageRef.current;
        
        // Wait a bit to ensure all elements are properly rendered
        setTimeout(() => {
          // Get the dimensions of the map content area and image
          const contentRect = mapContent.getBoundingClientRect();
          
          // Account for the bottom controls and other UI elements
          const bottomControlsHeight = 80;
          const visibleHeight = contentRect.height - bottomControlsHeight;
          
          const imageWidth = mapImage.naturalWidth;
          const imageHeight = mapImage.naturalHeight;
          
          // Calculate the position to center the map
          // Move further to the left with an additional offset
          const centerX = (contentRect.width - imageWidth) / 2 - 80;
          // Move much higher with a larger offset
          const centerY = (visibleHeight - imageHeight) / 2 - 250;
          
          // Set position to center the map
          setPosition({ x: centerX, y: centerY });
          
          // Reset scale to 1 (default)
          setScale(1);
        }, 100); // Short delay to ensure measurements are accurate
      }
    };

    // Center and fit map when image loads
    const imageElement = mapImageRef.current;
    if (imageElement) {
      imageElement.onload = centerAndFitMap;
    }

    // Initial centering
    centerAndFitMap();

    return () => {
      if (imageElement) {
        imageElement.onload = null;
      }
    };
  }, [mapUrl]);

  // Handle movement controls with reversed directions
  const handleMoveUp = () => {
    setPosition(prev => ({ ...prev, y: prev.y - 50 }));
  };

  const handleMoveDown = () => {
    setPosition(prev => ({ ...prev, y: prev.y + 50 }));
  };

  const handleMoveLeft = () => {
    setPosition(prev => ({ ...prev, x: prev.x - 50 }));
  };

  const handleMoveRight = () => {
    setPosition(prev => ({ ...prev, x: prev.x + 50 }));
  };

  // Handle scale change
  const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value));
  };

  // Handle tool selection
  const handleToolSelect = (toolName: string) => {
    setActiveToolName(toolName);
    setIsToolExpanded(!isToolExpanded || activeToolName !== toolName);
  };

  // Handle scale distance option change
  const handleScaleDistanceOptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setScaleDistanceOption(value);
    
    if (value !== "custom") {
      setScaleDistance(parseInt(value));
    } else {
      setScaleDistance(parseInt(customScaleDistance) || 10);
    }
  };

  // Handle custom scale distance change
  const handleCustomScaleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomScaleDistance(value);
    
    if (scaleDistanceOption === "custom") {
      setScaleDistance(parseInt(value) || 10);
    }
  };

  // Handle set scale button
  const handleSetScale = () => {
    setIsSettingScale(true);
    setScalePoints([]);
  };

  // Handle remove scale button
  const handleRemoveScale = () => {
    setScalePoints([]);
    setMapScale(null);
    setIsSettingScale(false);
  };

  // Handle map click for setting scale points
  const handleMapClick = (e: React.MouseEvent) => {
    // Don't place points if we're dragging the map or a point
    if (isDraggingMap || draggingPointIndex !== null) return;
    
    // Only place points if we're in scale tool mode and setting scale
    if (!isSettingScale || activeToolName !== 'scale') return;
    if (scalePoints.length >= 2) return;

    const mapContent = mapContentRef.current;
    const mapWrapper = mapWrapperRef.current;
    if (!mapContent || !mapWrapper) return;

    const wrapperRect = mapWrapper.getBoundingClientRect();
    
    // Calculate click position relative to the map wrapper
    const clickX = (e.clientX - wrapperRect.left) / scale;
    const clickY = (e.clientY - wrapperRect.top) / scale;

    if (scalePoints.length < 2) {
      setScalePoints(prev => [...prev, { x: clickX, y: clickY }]);
    }

    // If we now have 2 points, calculate the scale
    if (scalePoints.length === 1) {
      setTimeout(() => {
        const point1 = scalePoints[0];
        const point2 = { x: clickX, y: clickY };
        
        // Calculate distance between points in pixels
        const pixelDistance = Math.sqrt(
          Math.pow(point2.x - point1.x, 2) + 
          Math.pow(point2.y - point1.y, 2)
        );
        
        // Calculate scale (meters per pixel)
        const metersPerPixel = scaleDistance / pixelDistance;
        setMapScale(metersPerPixel);
        setIsSettingScale(false);
      }, 0);
    }
  };

  // Handle mouse down on scale point for dragging
  const handleScalePointMouseDown = (index: number, e: React.MouseEvent) => {
    // Prevent dragging if the tool is not expanded
    if (!isToolExpanded) return;
    
    e.stopPropagation();
    setDraggingPointIndex(index);
    
    // Set up event listeners for mouse move and mouse up
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper) return;

      const rect = mapWrapper.getBoundingClientRect();
      const mouseX = (moveEvent.clientX - rect.left) / scale;
      const mouseY = (moveEvent.clientY - rect.top) / scale;

      setScalePoints(prev => {
        const newPoints = [...prev];
        newPoints[index] = { x: mouseX, y: mouseY };
        return newPoints;
      });

      // Recalculate scale
      if (scalePoints.length === 2) {
        const otherIndex = index === 0 ? 1 : 0;
        const point1 = scalePoints[otherIndex];
        const point2 = { x: mouseX, y: mouseY };
        
        // Calculate distance between points in pixels
        const pixelDistance = Math.sqrt(
          Math.pow(point2.x - point1.x, 2) + 
          Math.pow(point2.y - point1.y, 2)
        );
        
        // Calculate scale (meters per pixel)
        const metersPerPixel = scaleDistance / pixelDistance;
        setMapScale(metersPerPixel);
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setDraggingPointIndex(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle mouse down on map for dragging
  const handleMapMouseDown = (e: React.MouseEvent) => {
    // Don't start map drag if we're in scale tool mode or already dragging a point
    if (activeToolName === 'scale' || draggingPointIndex !== null) return;
    
    setIsDraggingMap(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setStartPosition({ ...position });
    
    // Set up event listeners for mouse move and mouse up
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - dragStart.x;
      const deltaY = moveEvent.clientY - dragStart.y;
      setPosition({
        x: startPosition.x + deltaX,
        y: startPosition.y + deltaY
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setIsDraggingMap(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="map-maker-container">
      {/* Left sidebar - Map Key */}
      <div className="sidebar left-sidebar">
        <h3>Map Key</h3>
        <div className="map-key-content">
          {/* Empty for now as specified */}
        </div>
      </div>

      {/* Main map area */}
      <div className="map-area">
        <div 
          className="map-content" 
          ref={mapContentRef}
          onClick={handleMapClick}
          onMouseDown={handleMapMouseDown}
        >
          <div 
            className="map-wrapper" 
            ref={mapWrapperRef}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'center',
              transition: draggingPointIndex !== null || isDraggingMap ? 'none' : 'transform 0.2s ease-out'
            }}
          >
            {/* Corner dots */}
            <div className="corner-dot top-left" />
            <div className="corner-dot top-right" />
            <div className="corner-dot bottom-left" />
            <div className="corner-dot bottom-right" />
            
            {/* Map image */}
            <img 
              ref={mapImageRef}
              src={mapUrl} 
              alt="Map" 
              className="map-image"
              draggable="false"
            />
            
            {/* Scale points - now inside the map wrapper */}
            {scalePoints.map((point, index) => (
              <div 
                key={index}
                className={`scale-point ${isToolExpanded ? 'draggable' : ''}`}
                style={{
                  left: `${point.x}px`,
                  top: `${point.y}px`
                }}
                onMouseDown={(e) => handleScalePointMouseDown(index, e)}
              />
            ))}
            
            {/* Scale line - now inside the map wrapper */}
            {scalePoints.length > 0 && (
              <div 
                className="scale-line" 
                style={
                  scalePoints.length === 2 
                    ? {
                        left: `${scalePoints[0].x}px`,
                        top: `${scalePoints[0].y}px`,
                        width: `${Math.sqrt(
                          Math.pow(scalePoints[1].x - scalePoints[0].x, 2) + 
                          Math.pow(scalePoints[1].y - scalePoints[0].y, 2)
                        )}px`,
                        transform: `rotate(${Math.atan2(
                          scalePoints[1].y - scalePoints[0].y, 
                          scalePoints[1].x - scalePoints[0].x
                        )}rad)`,
                        transformOrigin: 'left center'
                      }
                    : { 
                        left: `${scalePoints[0].x}px`, 
                        top: `${scalePoints[0].y}px`,
                        width: '0px'
                      }
                }
              />
            )}
          </div>
        </div>

        {/* Bottom controls */}
        <div className="bottom-controls">
          <div className="movement-controls">
            <button className="control-button left" onClick={handleMoveLeft}>
              ←
            </button>
            <button className="control-button up" onClick={handleMoveUp}>
              ↑
            </button>
            <button className="control-button down" onClick={handleMoveDown}>
              ↓
            </button>
            <button className="control-button right" onClick={handleMoveRight}>
              →
            </button>
          </div>

          <div className="scale-control">
            <span>Scale:</span>
            <input
              type="range"
              min="0.5"
              max="5"
              step="0.1"
              value={scale}
              onChange={handleScaleChange}
              className="scale-slider"
            />
            <span>{scale.toFixed(1)}x</span>
          </div>
        </div>

        {/* Back button */}
        <button className="back-button" onClick={onBack}>
          Back to Map Selection
        </button>
      </div>

      {/* Right sidebar - Tools */}
      <div className="sidebar right-sidebar">
        <h3>Tools</h3>
        <div className="tools-content">
          <div 
            className={`tool-item ${activeToolName === 'scale' ? 'active' : ''}`}
            onClick={() => handleToolSelect('scale')}
          >
            Scale {mapScale ? `(1px = ${mapScale.toFixed(2)}m)` : ''}
          </div>
          
          {activeToolName === 'scale' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option">
                <label>Distance (meters):</label>
                <select 
                  value={scaleDistanceOption} 
                  onChange={handleScaleDistanceOptionChange}
                >
                  <option value="10">10 meters</option>
                  <option value="25">25 meters</option>
                  <option value="50">50 meters</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              {scaleDistanceOption === 'custom' && (
                <div className="tool-option">
                  <input 
                    type="number" 
                    value={customScaleDistance}
                    onChange={handleCustomScaleDistanceChange}
                    min="1"
                  />
                  <span>meters</span>
                </div>
              )}
              
              <div className="tool-buttons">
                <button 
                  className="tool-button"
                  onClick={handleSetScale}
                >
                  Set Scale
                </button>
                <button 
                  className="tool-button"
                  onClick={handleRemoveScale}
                >
                  Remove Scale
                </button>
              </div>
              
              {mapScale && (
                <div className="scale-info">
                  <p>1 pixel = {mapScale.toFixed(2)} meters</p>
                  {isSettingScale ? (
                    <p>Click on map to place scale points</p>
                  ) : scalePoints.length === 2 ? (
                    <p>Drag points to adjust scale</p>
                  ) : scalePoints.length === 1 ? (
                    <p>Click again to place second point</p>
                  ) : null}
                </div>
              )}
              
              {isSettingScale && !mapScale && (
                <div className="scale-info">
                  <p>Click on map to place scale points</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapMaker;
