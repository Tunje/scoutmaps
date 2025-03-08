import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/MapMaker.css';

interface MapMakerProps {
  mapUrl: string;
  onBack: () => void;
}

interface ScalePoint {
  x: number;
  y: number;
}

interface Tent {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

interface Road {
  points: {x: number, y: number}[],
  color: string;
}

function MapMaker({ mapUrl, onBack }: MapMakerProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const mapImageRef = useRef<HTMLImageElement>(null);
  const mapContentRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapKeyRef = useRef<HTMLDivElement>(null);
  
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

  // Tent tool states
  const [tents, setTents] = useState<Tent[]>([]);
  const [tentWidth, setTentWidth] = useState<number>(3);
  const [tentHeight, setTentHeight] = useState<number>(3);
  const [tentColor, setTentColor] = useState<string>('green');

  // State for tent placement mode
  const [isPlacingTent, setIsPlacingTent] = useState<boolean>(false);

  // State for tent rotation
  const [tentRotation, setTentRotation] = useState<number>(0);

  // State for tent removal mode
  const [isRemovingTent, setIsRemovingTent] = useState<boolean>(false);
  const [hoveredTentIndex, setHoveredTentIndex] = useState<number | null>(null);

  // State for tent labels
  const [tentLabels, setTentLabels] = useState<{[key: number]: string}>({});
  const [editingLabelIndex, setEditingLabelIndex] = useState<number | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState<string>('');

  // State for highlighting tents from the map key
  const [highlightedTentIndex, setHighlightedTentIndex] = useState<number | null>(null);

  // Road tool states
  const [roads, setRoads] = useState<Road[]>([]);
  const [currentRoad, setCurrentRoad] = useState<Road | null>(null);
  const [isPlacingRoad, setIsPlacingRoad] = useState<boolean>(false);
  const [roadColor, setRoadColor] = useState<string>('#000000');

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
    // Don't allow selecting tent tool if scale is not set
    if (toolName === 'tent' && !mapScale) {
      return;
    }
    
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
    setTents([]);
  };

  // Handle map click for setting scale points or placing tents
  const handleMapClickForScale = (e: React.MouseEvent) => {
    // Don't place points if we're dragging the map or a point
    if (isDraggingMap || draggingPointIndex !== null) return;
    
    // Handle scale point placement
    if (isSettingScale && activeToolName === 'scale') {
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
          setTents([]);
        }, 0);
      }
    }
  };

  const handleMapClickForTent = (e: React.MouseEvent) => {
    // Handle tent placement
    if (isPlacingTent && activeToolName === 'tent' && mapScale) {
      const mapContent = mapContentRef.current;
      const mapWrapper = mapWrapperRef.current;
      if (!mapContent || !mapWrapper) return;

      const wrapperRect = mapWrapper.getBoundingClientRect();
      
      // Calculate click position relative to the map wrapper
      const clickX = (e.clientX - wrapperRect.left) / scale;
      const clickY = (e.clientY - wrapperRect.top) / scale;

      // Convert tent size from meters to pixels using the map scale
      if (mapScale) {
        // mapScale is meters per pixel, so divide meters by mapScale to get pixels
        const widthInPixels = tentWidth / mapScale;
        const heightInPixels = tentHeight / mapScale;

        const newTents = [...tents, { 
          x: clickX - widthInPixels / 2, // Center the tent on the click position
          y: clickY - heightInPixels / 2, 
          width: widthInPixels, 
          height: heightInPixels, 
          rotation: tentRotation,
          color: tentColor
        }];
        
        setTents(newTents);
        
        // Add default label for the new tent
        const newTentIndex = newTents.length - 1;
        setTentLabels(prev => ({
          ...prev,
          [newTentIndex]: `Tent ${newTentIndex + 1}`
        }));
      }
      
      // Exit placement mode after placing a tent
      setIsPlacingTent(false);
    }
  };

  const handleMapClickForRoad = (e: React.MouseEvent) => {
    if (isPlacingRoad && currentRoad) {
      const mapContent = mapContentRef.current;
      const mapWrapper = mapWrapperRef.current;
      if (!mapContent || !mapWrapper) return;

      const wrapperRect = mapWrapper.getBoundingClientRect();
      
      // Calculate click position relative to the map wrapper
      const clickX = (e.clientX - wrapperRect.left) / scale;
      const clickY = (e.clientY - wrapperRect.top) / scale;

      // Check if we're clicking near an existing point (for snapping)
      const snapRadius = 10 / scale; // 10 pixels snap radius, adjusted for zoom
      let snappedToExisting = false;

      // First check current road points
      if (currentRoad.points.length > 0) {
        for (const point of currentRoad.points) {
          const distance = Math.sqrt(Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2));
          if (distance < snapRadius) {
            // Snap to existing point
            setCurrentRoad(prev => ({
              ...prev,
              points: [...prev.points, { x: point.x, y: point.y }]
            }));
            snappedToExisting = true;
            break;
          }
        }
      }

      // Then check other roads' points
      if (!snappedToExisting) {
        for (const road of roads) {
          for (const point of road.points) {
            const distance = Math.sqrt(Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2));
            if (distance < snapRadius) {
              // Snap to existing point
              setCurrentRoad(prev => ({
                ...prev,
                points: [...prev.points, { x: point.x, y: point.y }]
              }));
              snappedToExisting = true;
              break;
            }
          }
          if (snappedToExisting) break;
        }
      }

      // If not snapped to any existing point, add new point
      if (!snappedToExisting) {
        setCurrentRoad(prev => ({
          ...prev,
          points: [...prev.points, { x: clickX, y: clickY }]
        }));
      }
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (isSettingScale) {
      handleMapClickForScale(e);
    } else if (isPlacingTent) {
      handleMapClickForTent(e);
    } else if (isPlacingRoad) {
      handleMapClickForRoad(e);
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
      
      // Calculate click position relative to the map wrapper
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
        setTents([]);
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
    // Don't start map drag if we're in scale tool mode, placing a tent, placing a road, or already dragging a point
    if (activeToolName === 'scale' || isPlacingTent || isPlacingRoad || draggingPointIndex !== null) return;
    
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

  // Handle place tent button
  const handlePlaceTentButton = () => {
    setIsPlacingTent(true);
  };

  // Handle tent width change
  const handleTentWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setTentWidth(value);
  };

  // Handle tent height change
  const handleTentHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    setTentHeight(value);
  };

  // Handle tent rotation
  const handleRotateLeft = () => {
    setTentRotation(prev => (prev - 10) % 360);
  };

  const handleRotateRight = () => {
    setTentRotation(prev => (prev + 10) % 360);
  };

  // Handle remove tent button
  const handleRemoveTentButton = () => {
    setIsRemovingTent(true);
    setIsPlacingTent(false);
  };

  // Handle tent hover
  const handleTentMouseEnter = (index: number) => {
    if (isRemovingTent) {
      setHoveredTentIndex(index);
    }
  };

  const handleTentMouseLeave = () => {
    setHoveredTentIndex(null);
  };

  // Handle tent click for removal
  const handleTentClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent map click
    if (isRemovingTent) {
      setTents(prev => {
        const newTents = prev.filter((_, i) => i !== index);
        
        // Update tent labels to reflect the new indices
        const newLabels: {[key: number]: string} = {};
        Object.keys(tentLabels).forEach(key => {
          const keyNum = parseInt(key);
          if (keyNum < index) {
            newLabels[keyNum] = tentLabels[keyNum];
          } else if (keyNum > index) {
            newLabels[keyNum - 1] = tentLabels[keyNum];
          }
        });
        setTentLabels(newLabels);
        
        return newTents;
      });
      setHoveredTentIndex(null);
    }
  };

  // Handle tent label edit
  const handleEditLabel = (index: number) => {
    setEditingLabelIndex(index);
    setEditingLabelValue(tentLabels[index] || `Tent ${index + 1}`);
  };

  // Handle tent label change
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingLabelValue(e.target.value);
  };

  // Handle tent label save
  const handleLabelSave = () => {
    if (editingLabelIndex !== null) {
      setTentLabels(prev => ({
        ...prev,
        [editingLabelIndex]: editingLabelValue
      }));
      setEditingLabelIndex(null);
    }
  };

  // Tent color options
  const tentColorOptions = [
    { name: 'Green', value: 'green' },
    { name: 'Blue', value: 'blue' },
    { name: 'Red', value: 'red' },
    { name: 'Yellow', value: 'yellow' },
    { name: 'Orange', value: 'orange' },
    { name: 'Purple', value: 'purple' },
  ];

  // Handle tent color change
  const handleTentColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTentColor(e.target.value);
  };

  // Handle tent highlight from map key
  const handleTentHighlightFromKey = (index: number) => {
    setHighlightedTentIndex(index);
  };

  // Handle tent unhighlight from map key
  const handleTentUnhighlightFromKey = () => {
    setHighlightedTentIndex(null);
  };

  // Calculate highlight line position
  const getHighlightLinePosition = useCallback(() => {
    if (highlightedTentIndex === null || !mapKeyRef.current || !mapWrapperRef.current) {
      return null;
    }

    const tent = tents[highlightedTentIndex];
    if (!tent) return null;

    const keyItem = mapKeyRef.current.querySelector(`.map-key-item:nth-child(${highlightedTentIndex + 1})`) as HTMLElement;
    if (!keyItem) return null;

    const mapWrapperRect = mapWrapperRef.current.getBoundingClientRect();
    const keyItemRect = keyItem.getBoundingClientRect();
    const keyRight = mapKeyRef.current.getBoundingClientRect().right;

    return {
      x1: keyRight - mapWrapperRect.left,
      y1: keyItemRect.top + keyItemRect.height / 2 - mapWrapperRect.top,
      x2: tent.x * scale + (tent.width * scale) / 2,
      y2: tent.y * scale + (tent.height * scale) / 2
    };
  }, [highlightedTentIndex, tents, scale]);

  // Get highlight line position
  const highlightLinePosition = getHighlightLinePosition();

  // Handle start road
  const handleStartRoad = () => {
    setIsPlacingRoad(true);
    setCurrentRoad({ points: [], color: roadColor });
  };

  // Handle finish road
  const handleFinishRoad = () => {
    if (currentRoad) {
      setRoads(prev => [...prev, currentRoad]);
    }
    setIsPlacingRoad(false);
    setCurrentRoad(null);
  };

  // Handle cancel road
  const handleCancelRoad = () => {
    setIsPlacingRoad(false);
    setCurrentRoad(null);
  };

  return (
    <div className="map-maker-container">
      {/* Left sidebar - Map Key */}
      <div className="sidebar left-sidebar" ref={mapKeyRef}>
        <h3>Map Key</h3>
        <div className="map-key-content">
          {tents.length > 0 && (
            <div className="map-key-section">
              <h4>Tents</h4>
              <ul className="map-key-list">
                {tents.map((tent, index) => (
                  <li 
                    key={index} 
                    className="map-key-item"
                    onMouseEnter={() => handleTentHighlightFromKey(index)}
                    onMouseLeave={handleTentUnhighlightFromKey}
                  >
                    <div 
                      className="map-key-color" 
                      style={{ backgroundColor: tent.color }}
                    ></div>
                    {editingLabelIndex === index ? (
                      <input 
                        type="text" 
                        value={editingLabelValue}
                        onChange={handleLabelChange}
                        onBlur={handleLabelSave}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleLabelSave();
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="map-key-label">
                          {tentLabels[index] || `Tent ${index + 1}`}
                        </span>
                        <button 
                          className="edit-label-button"
                          onClick={() => handleEditLabel(index)}
                        >
                          ✎
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
            
            {/* Tents */}
            {tents.map((tent, index) => (
              <div 
                key={index}
                className={`tent ${isRemovingTent && hoveredTentIndex === index ? 'hovered' : ''} ${highlightedTentIndex === index ? 'highlighted' : ''}`}
                style={{
                  left: `${tent.x}px`,
                  top: `${tent.y}px`,
                  width: `${tent.width}px`,
                  height: `${tent.height}px`,
                  transform: `rotate(${tent.rotation}deg)`,
                  backgroundColor: tent.color
                }}
                onMouseEnter={() => handleTentMouseEnter(index)}
                onMouseLeave={handleTentMouseLeave}
                onClick={(e) => handleTentClick(index, e)}
              />
            ))}
            
            {/* Roads */}
            {roads.map((road, index) => (
              <svg 
                key={`road-${index}`}
                className="road"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  transformOrigin: '0 0'
                }}
              >
                <polyline 
                  points={road.points.map(point => `${point.x},${point.y}`).join(' ')}
                  style={{
                    fill: 'none',
                    stroke: road.color,
                    strokeWidth: '3px'
                  }}
                />
                {road.points.map((point, pointIndex) => (
                  <circle
                    key={`road-${index}-point-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={activeToolName === 'road' ? 4 : 1.5}
                    fill={road.color}
                  />
                ))}
              </svg>
            ))}
            
            {/* Current road */}
            {isPlacingRoad && currentRoad && (
              <svg 
                className="current-road"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  transformOrigin: '0 0'
                }}
              >
                <polyline 
                  points={currentRoad.points.map(point => `${point.x},${point.y}`).join(' ')}
                  style={{
                    fill: 'none',
                    stroke: currentRoad.color,
                    strokeWidth: '3px',
                    strokeDasharray: '5,5'
                  }}
                />
                {currentRoad.points.map((point, pointIndex) => (
                  <circle
                    key={`current-road-point-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={currentRoad.color}
                  />
                ))}
              </svg>
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
          {/* Scale Tool */}
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
                  <span>m</span>
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
                  <p>1 pixel = {mapScale.toFixed(2)}m</p>
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
          
          {/* Tent Tool - Only enabled if scale is set */}
          <div 
            className={`tool-item ${activeToolName === 'tent' ? 'active' : ''} ${!mapScale ? 'disabled' : ''}`}
            onClick={() => handleToolSelect('tent')}
          >
            Tent
          </div>
          {activeToolName === 'tent' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option tent-size">
                <label>Size:</label>
                <input 
                  type="number" 
                  value={tentWidth}
                  onChange={handleTentWidthChange}
                  min="1"
                  className="tent-dimension"
                />
                <span>x</span>
                <input 
                  type="number" 
                  value={tentHeight}
                  onChange={handleTentHeightChange}
                  min="1"
                  className="tent-dimension"
                />
                <span>m</span>
              </div>
              
              <div className="tool-option">
                <label>Color:</label>
                <select 
                  value={tentColor} 
                  onChange={handleTentColorChange}
                >
                  {tentColorOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Tent preview */}
              {mapScale && (
                <div className="tent-preview-container">
                  <div className="tent-preview-label">Preview:</div>
                  <div className="tent-preview">
                    <div 
                      className="tent-preview-box"
                      style={{
                        width: `${tentWidth * 2}px`,
                        height: `${tentHeight * 2}px`,
                        transform: `rotate(${tentRotation}deg)`,
                        backgroundColor: tentColor
                      }}
                    ></div>
                  </div>
                  <div className="tent-rotation-controls">
                    <button 
                      className="rotation-button"
                      onClick={handleRotateLeft}
                    >
                      ↺ Rotate Left
                    </button>
                    <button 
                      className="rotation-button"
                      onClick={handleRotateRight}
                    >
                      Rotate Right ↻
                    </button>
                  </div>
                </div>
              )}
              
              <div className="tool-buttons">
                <button 
                  className="tool-button"
                  onClick={handlePlaceTentButton}
                >
                  Place Tent
                </button>
                <button 
                  className="tool-button"
                  onClick={handleRemoveTentButton}
                >
                  Remove Tent
                </button>
              </div>
            </div>
          )}
          
          {/* Road Tool - Only enabled if scale is set */}
          <div 
            className={`tool-item ${activeToolName === 'road' ? 'active' : ''} ${!mapScale ? 'disabled' : ''}`}
            onClick={() => handleToolSelect('road')}
          >
            Road
          </div>
          {activeToolName === 'road' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option">
                <label>Color:</label>
                <input 
                  type="color" 
                  value={roadColor}
                  onChange={(e) => setRoadColor(e.target.value)}
                />
              </div>
              
              <div className="tool-buttons">
                {!isPlacingRoad ? (
                  <button 
                    className="tool-button"
                    onClick={handleStartRoad}
                  >
                    Start Road
                  </button>
                ) : (
                  <>
                    <button 
                      className="tool-button"
                      onClick={handleFinishRoad}
                    >
                      Finish Road
                    </button>
                    <button 
                      className="tool-button"
                      onClick={handleCancelRoad}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              
              {isPlacingRoad && (
                <div className="road-info">
                  <p>Click on map to place road points</p>
                  <p>Click on existing points to connect</p>
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
