import React, { useState, useRef, useEffect } from 'react';
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

interface Village {
  points: {x: number, y: number}[],
  color: string;
  area: number; // in square meters
}

interface Utility {
  x: number;
  y: number;
  type: 'electricity' | 'water' | 'waste' | 'other';
  radius: number;
  showRadius: boolean;
  color: string;
}

interface ScoutGroup {
  id: number;
  name: string;
  numberOfScouts: number;
  requiredUtilities: ('electricity' | 'water' | 'waste' | 'other')[];
  assignedVillageIndex: number | null;
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
  const [isToolExpanded, setIsToolExpanded] = useState<boolean>(false);

  // Tent tool states
  const [tents, setTents] = useState<Tent[]>([]);
  const [tentWidth, setTentWidth] = useState<number>(3);
  const [tentHeight, setTentHeight] = useState<number>(3);
  const [tentColor, setTentColor] = useState<string>('#4CAF50');

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

  // Village tool states
  const [villages, setVillages] = useState<Village[]>([]);
  const [villageColor, setVillageColor] = useState<string>('#3498db');
  const [isPlacingVillage, setIsPlacingVillage] = useState<boolean>(false);
  const [isRemovingVillage, setIsRemovingVillage] = useState<boolean>(false);
  const [currentVillage, setCurrentVillage] = useState<Village | null>(null);
  const [draggingVillageIndex, setDraggingVillageIndex] = useState<number | null>(null);
  const [draggingVillagePointIndex, setDraggingVillagePointIndex] = useState<number | null>(null);

  // State for map key tabs
  const [activeTab, setActiveTab] = useState<'mapKey' | 'villages'>('mapKey');

  // State for village display options
  const [villageDisplayMode, setVillageDisplayMode] = useState<'default' | 'numbered' | 'distances' | 'area' | 'scouts'>('default');
  
  // State for selected village in the list
  const [selectedVillageIndex, setSelectedVillageIndex] = useState<number | null>(null);

  // State for editing village name
  const [editingVillageIndex, setEditingVillageIndex] = useState<number | null>(null);
  const [villageNames, setVillageNames] = useState<string[]>([]);

  // Utility tool state
  const [utilities, setUtilities] = useState<Utility[]>([]);
  const [currentUtilityType, setCurrentUtilityType] = useState<'electricity' | 'water' | 'waste' | 'other'>('electricity');
  const [utilityRadius, setUtilityRadius] = useState<number>(20); // Default radius in meters
  const [showUtilityRadius, setShowUtilityRadius] = useState<boolean>(true);
  const [utilityColor, setUtilityColor] = useState<string>('#FFD700'); // Default color for utilities
  const [isRemovingUtility, setIsRemovingUtility] = useState<boolean>(false);

  // Scout Group tool state
  const [scoutGroups, setScoutGroups] = useState<ScoutGroup[]>([]);
  const [isScoutGroupModalOpen, setIsScoutGroupModalOpen] = useState<boolean>(false);
  const [currentScoutGroup, setCurrentScoutGroup] = useState<ScoutGroup | null>(null);
  const [editingScoutGroupId, setEditingScoutGroupId] = useState<number | null>(null);

  // State for PDF export
  const [isPdfGenerating, setIsPdfGenerating] = useState<boolean>(false);

  // Function to clear tents completely
  const clearAllTents = () => {
    setTents([]);
    setHighlightedTentIndex(null);
    setHoveredTentIndex(null);
    setEditingLabelIndex(null);
  };

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
          const centerX = (contentRect.width - imageWidth) / 2 + 400; // Move 400 pixels to the right
          const centerY = (visibleHeight - imageHeight) / 2 - 225; // Move 225 pixels up (250 - 25)
          
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
      // Recalculate scale if we have two points
      if (scalePoints.length === 2) {
        recalculateScale(parseInt(value));
      }
    } else {
      const customValue = parseInt(customScaleDistance) || 10;
      setScaleDistance(customValue);
      // Recalculate scale if we have two points
      if (scalePoints.length === 2) {
        recalculateScale(customValue);
      }
    }
  };

  // Handle custom scale distance change
  const handleCustomScaleDistanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomScaleDistance(value);
    
    if (scaleDistanceOption === "custom") {
      const numValue = parseInt(value) || 10;
      setScaleDistance(numValue);
      
      // Recalculate scale if we have two points
      if (scalePoints.length === 2) {
        // Force recalculation by creating a new copy of scale points
        const updatedPoints = [...scalePoints];
        setScalePoints(updatedPoints);
        recalculateScale(numValue);
      }
    }
  };

  // Handle set scale button
  const handleSetScale = () => {
    setIsSettingScale(true);
    setScalePoints([]);
    clearAllTents();
  };

  // Handle remove scale button
  const handleRemoveScale = () => {
    setScalePoints([]);
    setMapScale(null);
    setIsSettingScale(false);
    clearAllTents();
  };

  // Handle map click
  const handleMapClick = (e: React.MouseEvent) => {
    if (!mapContentRef.current || !mapWrapperRef.current) return;

    const wrapperRect = mapWrapperRef.current.getBoundingClientRect();
    
    // Calculate click position relative to the map wrapper
    const clickX = (e.clientX - wrapperRect.left) / scale;
    const clickY = (e.clientY - wrapperRect.top) / scale;

    // Check if we're in village removal mode
    if (isRemovingVillage) {
      // Find if we clicked inside a village
      for (let i = 0; i < villages.length; i++) {
        const village = villages[i];
        if (isPointInPolygon({x: clickX, y: clickY}, village.points)) {
          // Remove the village
          setVillages(prev => prev.filter((_, index) => index !== i));
          return;
        }
      }
      return;
    }

    if (isSettingScale && activeToolName === 'scale') {
      handleMapClickForScale(e);
    } else if (isPlacingTent && activeToolName === 'tent') {
      handleMapClickForTent(e);
    } else if (isPlacingRoad && activeToolName === 'road') {
      handleMapClickForRoad(e);
    } else if (isPlacingVillage && activeToolName === 'village') {
      handleMapClickForVillage(e);
    } else if (activeToolName === 'utility') {
      handleAddUtility(e);
    }
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
      
      // Reset tent placement mode
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
      if (currentRoad?.points?.length > 0) {
        for (const point of currentRoad.points) {
          const distance = Math.sqrt(Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2));
          if (distance < snapRadius) {
            // Snap to existing point
            setCurrentRoad(prev => prev && ({
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
              setCurrentRoad(prev => prev && ({
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
        setCurrentRoad(prev => prev && ({
          ...prev,
          points: [...prev.points, { x: clickX, y: clickY }]
        }));
      }
    }
  };

  const handleMapClickForVillage = (e: React.MouseEvent) => {
    if (isPlacingVillage && currentVillage) {
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

      // First check current village points
      if (currentVillage.points.length > 0) {
        for (const point of currentVillage.points) {
          const distance = Math.sqrt(Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2));
          if (distance < snapRadius) {
            // Snap to existing point
            if (currentVillage) {
              setCurrentVillage({
                ...currentVillage,
                points: [...currentVillage.points, { x: point.x, y: point.y }]
              });
            }
            snappedToExisting = true;
            break;
          }
        }
      }

      // Then check other villages' points
      if (!snappedToExisting) {
        for (const village of villages) {
          for (const point of village.points) {
            const distance = Math.sqrt(Math.pow(point.x - clickX, 2) + Math.pow(point.y - clickY, 2));
            if (distance < snapRadius) {
              // Snap to existing point
              if (currentVillage) {
                setCurrentVillage({
                  ...currentVillage,
                  points: [...currentVillage.points, { x: point.x, y: point.y }]
                });
              }
              snappedToExisting = true;
              break;
            }
          }
          if (snappedToExisting) break;
        }
      }

      // If not snapped to any existing point, add new point
      if (!snappedToExisting) {
        // Check if the new line segment would cross any road
        const wouldCrossRoad = checkIfVillageLineCrossesRoad(
          currentVillage.points.length > 0 ? currentVillage.points[currentVillage.points.length - 1] : null,
          { x: clickX, y: clickY },
          roads
        );

        if (wouldCrossRoad) {
          // Don't add the point if it would cross a road
          alert("Village boundaries cannot cross roads!");
          return;
        }

        if (currentVillage) {
          setCurrentVillage({
            ...currentVillage,
            points: [...currentVillage.points, { x: clickX, y: clickY }]
          });
        }
      }
    }
  };

  // Check if a village line segment would cross any road
  const checkIfVillageLineCrossesRoad = (
    startPoint: { x: number, y: number } | null,
    endPoint: { x: number, y: number } | null,
    roads: Road[]
  ): boolean => {
    if (!startPoint || !endPoint) return false; // No line segment yet

    // For each road
    for (const road of roads) {
      // For each road segment
      for (let i = 0; i < road.points.length - 1; i++) {
        const roadStart = road.points[i];
        const roadEnd = road.points[i + 1];

        // Check if the two line segments intersect
        if (
          doLineSegmentsIntersect(
            startPoint.x, startPoint.y,
            endPoint.x, endPoint.y,
            roadStart.x, roadStart.y,
            roadEnd.x, roadEnd.y
          )
        ) {
          // If they're just close but not actually intersecting, allow it
          const tolerance = 10; // Increased tolerance to avoid false positives
          if (!areLineSegmentsActuallyIntersecting(
            startPoint.x, startPoint.y,
            endPoint.x, endPoint.y,
            roadStart.x, roadStart.y,
            roadEnd.x, roadEnd.y,
            tolerance
          )) {
            continue;
          }
          return true;
        }
      }
    }

    return false;
  };

  // Helper function to check if two line segments intersect
  const doLineSegmentsIntersect = (
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    p4x: number, p4y: number
  ): boolean => {
    // Calculate the direction of the lines
    const d1x = p2x - p1x;
    const d1y = p2y - p1y;
    const d2x = p4x - p3x;
    const d2y = p4y - p3y;

    // Calculate the determinant
    const determinant = d1x * d2y - d1y * d2x;
    
    // If determinant is zero, lines are parallel
    if (determinant === 0) return false;

    const s = ((p1x - p3x) * d2y - (p1y - p3y) * d2x) / determinant;
    const t = ((p3x - p1x) * d1y - (p3y - p1y) * d1x) / -determinant;

    // Check if the intersection point is within both line segments
    return s >= 0 && s <= 1 && t >= 0 && t <= 1;
  };

  // Helper function to check if two line segments actually intersect with a tolerance
  const areLineSegmentsActuallyIntersecting = (
    p1x: number, p1y: number,
    p2x: number, p2y: number,
    p3x: number, p3y: number,
    p4x: number, p4y: number,
    tolerance: number
  ): boolean => {
    // Calculate the direction of the lines
    const d1x = p2x - p1x;
    const d1y = p2y - p1y;
    const d2x = p4x - p3x;
    const d2y = p4y - p3y;

    // Calculate the determinant
    const determinant = d1x * d2y - d1y * d2x;
    
    // If determinant is zero, lines are parallel
    if (Math.abs(determinant) < tolerance) return false;

    const s = ((p1x - p3x) * d2y - (p1y - p3y) * d2x) / determinant;
    const t = ((p3x - p1x) * d1y - (p3y - p1y) * d1x) / -determinant;

    // Check if the intersection point is within both line segments with tolerance
    return s >= tolerance && s <= 1 - tolerance && t >= tolerance && t <= 1 - tolerance;
  };

  // Check if a point is inside a polygon
  const isPointInPolygon = (point: {x: number, y: number}, polygon: {x: number, y: number}[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // Calculate the area of a polygon in square meters
  const calculatePolygonArea = (points: {x: number, y: number}[]): number => {
    if (points.length < 3) return 0;
    
    // Calculate area in pixels using Shoelace formula
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    area = Math.abs(area) / 2;
    
    // Convert to square meters using mapScale
    if (mapScale) {
      return Math.round(area * Math.pow(mapScale, 2));
    }
    
    return 0;
  };

  // Calculate how many scouts a village can accommodate
  const calculateScoutsCapacity = (areaInSquareMeters: number): { scoutGroups: number, scoutCapacity: number } => {
    // Each village gets a kitchen area of 21x13m = 273m²
    const kitchenArea = 273;
    
    // Remaining area after kitchen
    let remainingArea = areaInSquareMeters - kitchenArea;
    
    // If the area is too small, return 0
    if (remainingArea <= 0) {
      return { scoutGroups: 1, scoutCapacity: 0 };
    }
    
    // Calculate how many additional scout groups can fit (beyond the first one)
    // For simplicity, we'll determine this based on the area
    const additionalGroups = Math.floor(remainingArea / 500); // Assuming each additional group needs roughly 500m²
    const totalGroups = 1 + additionalGroups;
    
    // Each scout needs 10-12m², we'll use 11m² as an average
    const scoutsPerSquareMeter = 1 / 11;
    
    // For the first group, we already subtracted the kitchen area
    // For additional groups, we need to account for their storage areas (100m² each)
    let totalScoutArea = remainingArea - (additionalGroups * 100);
    
    // Calculate total scout capacity
    const scoutCapacity = Math.floor(totalScoutArea * scoutsPerSquareMeter);
    
    return { scoutGroups: totalGroups, scoutCapacity: Math.max(scoutCapacity, 1) };
  };

  // Handle mouse up for dragging
  const handleMouseUp = () => {
    setIsDraggingMap(false);
    setDraggingPointIndex(null);
    setDraggingVillageIndex(null);
    setDraggingVillagePointIndex(null);
  };

  // Handle mouse move for dragging
  const handleMapMouseMove = (e: MouseEvent) => {
    if (isDraggingMap) {
      // Handle map dragging
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      
      setPosition(prev => ({
        x: prev.x + dx,
        y: prev.y + dy
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (draggingPointIndex !== null) {
      // Handle tent point dragging
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper) return;
      
      const wrapperRect = mapWrapper.getBoundingClientRect();
      
      // Calculate new position relative to the map wrapper
      const newX = (e.clientX - wrapperRect.left) / scale;
      const newY = (e.clientY - wrapperRect.top) / scale;
      
      // Update the tent position
      setTents(prev => {
        const newTents = [...prev];
        newTents[draggingPointIndex] = {
          ...newTents[draggingPointIndex],
          x: newX,
          y: newY
        };
        return newTents;
      });
    } else if (draggingVillagePointIndex !== null && draggingVillageIndex !== null) {
      // Handle village point dragging
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper) return;
      
      const wrapperRect = mapWrapper.getBoundingClientRect();
      
      // Calculate new position relative to the map wrapper
      const newX = (e.clientX - wrapperRect.left) / scale;
      const newY = (e.clientY - wrapperRect.top) / scale;

      // Check if we should snap to a road
      let snappedToRoad = false;
      const snapRadius = 10 / scale; // 10 pixels snap radius, adjusted for zoom
      
      // Try to snap to road points
      for (const road of roads) {
        for (const point of road.points) {
          const distance = Math.sqrt(Math.pow(point.x - newX, 2) + Math.pow(point.y - newY, 2));
          if (distance < snapRadius) {
            // Snap to road point
            setVillages(prev => {
              const newVillages = [...prev];
              if (newVillages[draggingVillageIndex!]) {
                const newPoints = [...newVillages[draggingVillageIndex!].points];
                newPoints[draggingVillagePointIndex!] = { x: point.x, y: point.y };
                
                // Recalculate area
                const area = calculatePolygonArea(newPoints);
                
                newVillages[draggingVillageIndex!] = {
                  ...newVillages[draggingVillageIndex!],
                  points: newPoints,
                  area: area
                };
              }
              return newVillages;
            });
            snappedToRoad = true;
            break;
          }
        }
        if (snappedToRoad) break;
      }
      
      // If not snapped to a road point, check if we can snap to a road segment
      if (!snappedToRoad) {
        for (const road of roads) {
          for (let i = 0; i < road.points.length - 1; i++) {
            const roadStart = road.points[i];
            const roadEnd = road.points[i + 1];
            
            // Calculate the closest point on the road segment
            const closestPoint = getClosestPointOnLineSegment(
              newX, newY,
              roadStart.x, roadStart.y,
              roadEnd.x, roadEnd.y
            );
            
            const distance = Math.sqrt(
              Math.pow(closestPoint.x - newX, 2) + 
              Math.pow(closestPoint.y - newY, 2)
            );
            
            if (distance < snapRadius) {
              // Snap to road segment
              setVillages(prev => {
                const newVillages = [...prev];
                if (newVillages[draggingVillageIndex!]) {
                  const newPoints = [...newVillages[draggingVillageIndex!].points];
                  newPoints[draggingVillagePointIndex!] = { 
                    x: closestPoint.x, 
                    y: closestPoint.y 
                  };
                  
                  // Recalculate area
                  const area = calculatePolygonArea(newPoints);
                  
                  newVillages[draggingVillageIndex!] = {
                    ...newVillages[draggingVillageIndex!],
                    points: newPoints,
                    area: area
                  };
                }
                return newVillages;
              });
              snappedToRoad = true;
              break;
            }
          }
          if (snappedToRoad) break;
        }
      }
      
      // If not snapped to any road, just update the position
      if (!snappedToRoad) {
        setVillages(prev => {
          const newVillages = [...prev];
          if (newVillages[draggingVillageIndex!]) {
            const newPoints = [...newVillages[draggingVillageIndex!].points];
            newPoints[draggingVillagePointIndex!] = { x: newX, y: newY };
            
            // Recalculate area
            const area = calculatePolygonArea(newPoints);
            
            newVillages[draggingVillageIndex!] = {
              ...newVillages[draggingVillageIndex!],
              points: newPoints,
              area: area
            };
          }
          return newVillages;
        });
      }
    }
  };

  // Helper function to get the closest point on a line segment
  const getClosestPointOnLineSegment = (
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
  ) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    // If the line segment is just a point, return that point
    if (lengthSquared === 0) return { x: x1, y: y1 };
    
    // Calculate the projection of the point onto the line
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
    
    // Calculate the closest point on the line segment
    return {
      x: x1 + t * dx,
      y: y1 + t * dy
    };
  };

  // Handle village point mouse down for dragging
  const handleVillagePointMouseDown = (villageIndex: number, pointIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingVillageIndex(villageIndex);
    setDraggingVillagePointIndex(pointIndex);
  };

  const handleScalePointMouseDown = (pointIndex: number, e: React.MouseEvent) => {
    if (!isToolExpanded) return;
    
    e.stopPropagation();
    setDraggingPointIndex(pointIndex);
    
    // Store original scale points in case we need to cancel
    const originalScalePoints = [...scalePoints];
    const originalMapScale = mapScale;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingPointIndex === null) return;
      
      const mapWrapper = mapWrapperRef.current;
      if (!mapWrapper) return;
      
      const wrapperRect = mapWrapper.getBoundingClientRect();
      
      // Calculate new position relative to the map wrapper
      const newX = (e.clientX - wrapperRect.left) / scale;
      const newY = (e.clientY - wrapperRect.top) / scale;
      
      // Update the dragged point position
      setScalePoints(prev => {
        const newPoints = [...prev];
        newPoints[draggingPointIndex] = { x: newX, y: newY };
        return newPoints;
      });
    };
    
    const handleMouseUp = () => {
      setDraggingPointIndex(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Calculate the scale after dragging is complete
      if (scalePoints.length === 2) {
        const point1 = scalePoints[0];
        const point2 = scalePoints[1];
        
        // Calculate distance between points in pixels
        const pixelDistance = Math.sqrt(
          Math.pow(point2.x - point1.x, 2) + 
          Math.pow(point2.y - point1.y, 2)
        );
        
        // Only update if points are far enough apart
        if (pixelDistance > 5) { // Minimum 5 pixels apart
          const metersPerPixel = scaleDistance / pixelDistance;
          
          // Only update if the scale is reasonable
          if (metersPerPixel > 0 && isFinite(metersPerPixel)) {
            const oldScale = mapScale;
            setMapScale(metersPerPixel);
            
            // Clear tents when scale changes
            if (oldScale !== metersPerPixel) {
              clearAllTents();
            }
          } else {
            // If scale calculation failed, revert to original points
            setScalePoints(originalScalePoints);
            setMapScale(originalMapScale);
          }
        } else {
          // If points are too close, revert to original points
          setScalePoints(originalScalePoints);
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle tent mouse interactions
  const handleTentMouseEnter = (index: number) => {
    setHoveredTentIndex(index);
  };
  
  const handleTentMouseLeave = () => {
    setHoveredTentIndex(null);
  };
  
  const handleTentClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRemovingTent) {
      // Remove the tent
      setTents(prev => prev.filter((_, i) => i !== index));
      
      // Remove its label
      setTentLabels(prev => {
        const newLabels = { ...prev };
        delete newLabels[index];
        
        // Adjust indices for remaining tents
        const adjustedLabels: Record<number, string> = {};
        Object.entries(newLabels).forEach(([key, value]) => {
          const keyNum = parseInt(key);
          if (keyNum > index) {
            adjustedLabels[keyNum - 1] = value;
          } else {
            adjustedLabels[keyNum] = value;
          }
        });
        
        return adjustedLabels;
      });
    }
  };

  // Handle tent label editing
  const handleEditLabel = (index: number) => {
    setEditingLabelIndex(index);
    setEditingLabelValue(tentLabels[index] || `Tent ${index + 1}`);
  };
  
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingLabelValue(e.target.value);
  };
  
  const handleLabelSave = () => {
    if (editingLabelIndex !== null) {
      setTentLabels(prev => ({
        ...prev,
        [editingLabelIndex]: editingLabelValue
      }));
      setEditingLabelIndex(null);
    }
  };

  // Handle tent highlighting from key
  const handleTentHighlightFromKey = (index: number) => {
    setHighlightedTentIndex(index);
  };
  
  const handleTentUnhighlightFromKey = () => {
    setHighlightedTentIndex(null);
  };

  // Handle tent property changes
  const handleTentWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTentWidth(value);
    }
  };
  
  const handleTentHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setTentHeight(value);
    }
  };
  
  const handleTentColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTentColor(e.target.value);
  };

  // Handle tent rotation
  const handleRotateLeft = () => {
    setTentRotation(prev => prev - 15);
  };
  
  const handleRotateRight = () => {
    setTentRotation(prev => prev + 15);
  };

  // Handle tent placement button
  const handlePlaceTentButton = () => {
    setIsPlacingTent(true);
  };
  
  // Handle tent removal button
  const handleRemoveTentButton = () => {
    setIsRemovingTent(true);
  };

  // Handle road creation
  const handleStartRoad = () => {
    setIsPlacingRoad(true);
    setCurrentRoad({
      points: [],
      color: roadColor
    });
  };
  
  const handleFinishRoad = () => {
    if (currentRoad && currentRoad.points.length >= 2) {
      setRoads(prev => [...prev, currentRoad]);
      setCurrentRoad(null);
      setIsPlacingRoad(false);
    }
  };
  
  const handleCancelRoad = () => {
    setCurrentRoad(null);
    setIsPlacingRoad(false);
  };

  // Handle village creation
  const handleStartVillage = () => {
    setIsPlacingVillage(true);
    setIsRemovingVillage(false); // Deactivate Remove Village when Start Village is clicked
    setCurrentVillage({
      points: [],
      color: villageColor, // Use the selected color from the color picker
      area: 0 // Initialize area with 0
    });
  };
  
  const handleFinishVillage = () => {
    if (currentVillage && currentVillage.points.length >= 3) {
      // Calculate the area of the village
      const area = calculatePolygonArea(currentVillage.points);
      
      // Add the village with the calculated area
      setVillages(prev => [...prev, {
        ...currentVillage,
        area
      }]);
      
      setCurrentVillage(null);
      setIsPlacingVillage(false);
    }
  };
  
  const handleCancelVillage = () => {
    setCurrentVillage(null);
    setIsPlacingVillage(false);
  };

  // Handle village removal button
  const handleRemoveVillageButton = () => {
    setIsRemovingVillage(true);
    setIsPlacingVillage(false);
    setCurrentVillage(null);
  };

  // Function to handle village selection
  const handleVillageSelection = (index: number) => {
    if (selectedVillageIndex === index) {
      // If clicking the same village, close it
      setSelectedVillageIndex(null);
    } else {
      // Otherwise, select the village
      setSelectedVillageIndex(index);
    }
    // Always close any editing in progress
    setEditingVillageIndex(null);
  };

  // Function to handle village name edit
  const handleVillageNameEdit = (e: React.MouseEvent, index: number) => {
    e.stopPropagation(); // Prevent triggering the village selection
    setEditingVillageIndex(index);
  };

  // Function to save village name
  const handleVillageNameSave = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      const newName = input.value.trim();
      
      if (newName) {
        // Create a copy of the current names array
        const updatedNames = [...villageNames];
        // Ensure the array is long enough
        while (updatedNames.length <= index) {
          updatedNames.push(`Village ${updatedNames.length + 1}`);
        }
        // Update the name at the specified index
        updatedNames[index] = newName;
        setVillageNames(updatedNames);
      }
      
      setEditingVillageIndex(null);
    } else if (e.key === 'Escape') {
      setEditingVillageIndex(null);
    }
  };

  // Function to get village name
  const getVillageName = (index: number): string => {
    if (villageNames.length > index && villageNames[index]) {
      return villageNames[index];
    }
    return `Village ${index + 1}`;
  };

  // Set up event listeners for mouse events
  useEffect(() => {
    const handleMouseMoveEvent = (e: MouseEvent) => {
      handleMapMouseMove(e);
    };

    const handleMouseUpEvent = () => {
      handleMouseUp();
    };

    document.addEventListener('mousemove', handleMouseMoveEvent);
    document.addEventListener('mouseup', handleMouseUpEvent);

    return () => {
      document.removeEventListener('mousemove', handleMouseMoveEvent);
      document.removeEventListener('mouseup', handleMouseUpEvent);
    };
  }, [isDraggingMap, draggingPointIndex, draggingVillageIndex, draggingVillagePointIndex, scale, roads]);

  const recalculateScale = (newScaleDistance: number) => {
    if (scalePoints.length === 2) {
      const point1 = scalePoints[0];
      const point2 = scalePoints[1];
      
      // Calculate distance between points in pixels
      const pixelDistance = Math.sqrt(
        Math.pow(point2.x - point1.x, 2) + 
        Math.pow(point2.y - point1.y, 2)
      );
      
      // Calculate scale (meters per pixel) - prevent division by zero
      if (pixelDistance > 0) {
        const metersPerPixel = newScaleDistance / pixelDistance;
        setMapScale(metersPerPixel);
        
        // Clear tents when scale changes
        clearAllTents();
      }
    }
  };

  // Handle adding a utility
  const handleAddUtility = (e: React.MouseEvent) => {
    if (!mapScale) return; // Only allow placing utilities if scale is set
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newUtility: Utility = {
      x,
      y,
      type: currentUtilityType,
      radius: utilityRadius,
      showRadius: showUtilityRadius,
      color: utilityColor
    };
    
    setUtilities([...utilities, newUtility]);
  };

  // Check if a village is in range of a utility
  const checkVillageUtilityRange = (village: Village, utility: Utility): boolean => {
    if (!mapScale) return false; // No scale set
    
    // Get the center point of the village
    const centerX = village.points.reduce((sum, p) => sum + p.x, 0) / village.points.length;
    const centerY = village.points.reduce((sum, p) => sum + p.y, 0) / village.points.length;
    
    // Calculate distance between village center and utility in pixels
    const distanceInPixels = Math.sqrt(
      Math.pow(centerX - utility.x, 2) + 
      Math.pow(centerY - utility.y, 2)
    );
    
    // Convert utility radius from meters to pixels for comparison
    const radiusInPixels = utility.radius / mapScale;
    
    // Check if the village center is within the utility radius
    return distanceInPixels <= radiusInPixels;
  };

  // Get utilities in range of a village
  const getUtilitiesInRange = (village: Village): Utility[] => {
    return utilities.filter(utility => 
      checkVillageUtilityRange(village, utility)
    );
  };

  // Handle utility removal button
  const handleRemoveUtilityButton = () => {
    setIsRemovingUtility(true);
  };

  // Handle utility click when in removal mode
  const handleUtilityClick = (index: number) => {
    if (isRemovingUtility) {
      // Remove the utility at the given index
      const updatedUtilities = [...utilities];
      updatedUtilities.splice(index, 1);
      setUtilities(updatedUtilities);
    }
  };

  // Handle utility type change and set default color based on type
  const handleUtilityTypeChange = (type: 'electricity' | 'water' | 'waste' | 'other') => {
    setCurrentUtilityType(type);
    
    // Set default color based on utility type
    switch(type) {
      case 'electricity':
        setUtilityColor('#FFD700'); // Gold for electricity
        break;
      case 'water':
        setUtilityColor('#1E90FF'); // Blue for water
        break;
      case 'waste':
        setUtilityColor('#006400'); // Dark green for waste
        break;
      case 'other':
        setUtilityColor('#FF4500'); // Orange-red for other
        break;
    }
  };

  // Scout Group Management Functions
  const handleOpenScoutGroupModal = (groupId?: number) => {
    if (groupId !== undefined) {
      const groupToEdit = scoutGroups.find(group => group.id === groupId);
      if (groupToEdit) {
        setCurrentScoutGroup({...groupToEdit});
        setEditingScoutGroupId(groupId);
      }
    } else {
      setCurrentScoutGroup({
        id: Date.now(), // Use timestamp as a simple unique ID
        name: '',
        numberOfScouts: 0,
        requiredUtilities: [],
        assignedVillageIndex: null
      });
      setEditingScoutGroupId(null);
    }
    setIsScoutGroupModalOpen(true);
  };

  const handleCloseScoutGroupModal = () => {
    setIsScoutGroupModalOpen(false);
    setCurrentScoutGroup(null);
    setEditingScoutGroupId(null);
  };

  const handleSaveScoutGroup = () => {
    if (!currentScoutGroup) return;
    
    if (editingScoutGroupId !== null) {
      // Update existing group
      setScoutGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === editingScoutGroupId ? currentScoutGroup : group
        )
      );
    } else {
      // Add new group
      setScoutGroups(prevGroups => [...prevGroups, currentScoutGroup]);
    }
    
    handleCloseScoutGroupModal();
  };

  const handleDeleteScoutGroup = (groupId: number) => {
    setScoutGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
  };

  // Check if a village meets the requirements for a scout group
  const checkVillageRequirements = (villageIndex: number, group: ScoutGroup): boolean => {
    const village = villages[villageIndex];
    if (!village) return false;
    
    // Check if the village has enough capacity for the scouts
    const assignedGroups = scoutGroups.filter(g => g.assignedVillageIndex === villageIndex && g.id !== group.id);
    const totalAssignedScouts = assignedGroups.reduce((sum, g) => sum + g.numberOfScouts, 0);
    const villageCapacity = calculateScoutsCapacity(village.area).scoutCapacity;
    
    if (totalAssignedScouts + group.numberOfScouts > villageCapacity) {
      return false;
    }
    
    // Check if the village has all required utilities in range
    if (group.requiredUtilities.length > 0) {
      const villageUtilities = getUtilitiesInRange(village);
      const hasAllRequiredUtilities = group.requiredUtilities.every(requiredType => 
        villageUtilities.some(utility => utility.type === requiredType)
      );
      
      if (!hasAllRequiredUtilities) {
        return false;
      }
    }
    
    return true;
  };

  // Function to generate PDF using print
  const handleExportPDF = () => {
    setIsPdfGenerating(true);
    
    try {
      // Store current body overflow style and scale
      const originalOverflow = document.body.style.overflow;
      const originalBodyBackground = document.body.style.background;
      const originalScale = scale;
      const originalPosition = { ...position };
      
      // Create a print-specific stylesheet
      const style = document.createElement('style');
      style.id = 'print-style';
      style.innerHTML = `
        @media print {
          body * {
            visibility: hidden;
          }
          .map-area {
            visibility: visible;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
          }
          .map-area * {
            visibility: visible !important;
          }
          .map-content {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            overflow: visible !important;
          }
          .map-wrapper {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            max-width: 100% !important;
            max-height: 100% !important;
          }
          .tent, .road, svg, .village, .utility {
            visibility: visible !important;
            display: block !important;
            page-break-inside: avoid !important;
            transform: translate(8px, 23px) !important;
          }
          .tent {
            background-color: inherit !important;
            border-color: inherit !important;
            transform-origin: center !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          svg {
            overflow: visible !important;
          }
          .map-title {
            visibility: visible !important;
            position: fixed !important;
            top: 10px !important;
            width: 100% !important;
            text-align: center !important;
            font-size: 18px !important;
            font-weight: bold !important;
            z-index: 9999 !important;
          }
          .map-footer {
            visibility: visible !important;
            position: fixed !important;
            bottom: 10px !important;
            width: 100% !important;
            text-align: center !important;
            font-size: 12px !important;
            z-index: 9999 !important;
          }
          .tool-panel, .top-bar, .map-key-toggle {
            display: none !important;
          }
        }
      `;
      document.head.appendChild(style);
      
      // Add title and footer elements
      const title = document.createElement('div');
      title.className = 'map-title';
      title.innerHTML = 'Scout Camp Map';
      document.body.appendChild(title);
      
      const footer = document.createElement('div');
      footer.className = 'map-footer';
      footer.innerHTML = `Generated on: ${new Date().toLocaleDateString()}`;
      document.body.appendChild(footer);
      
      // Temporarily adjust the map scale and position for better printing
      setScale(1);
      setPosition({ x: 0, y: 0 });
      
      // Modify body for printing
      document.body.style.overflow = 'visible';
      document.body.style.background = 'white';
      
      // Wait for the state updates to take effect
      setTimeout(() => {
        // Print the page
        window.print();
        
        // Clean up after printing
        setTimeout(() => {
          // Remove print-specific styles and elements
          const printStyle = document.getElementById('print-style');
          if (printStyle) {
            printStyle.remove();
          }
          
          if (title) {
            title.remove();
          }
          
          if (footer) {
            footer.remove();
          }
          
          // Restore original styles and scale
          document.body.style.overflow = originalOverflow;
          document.body.style.background = originalBodyBackground;
          setScale(originalScale);
          setPosition(originalPosition);
          
          setIsPdfGenerating(false);
        }, 1000);
      }, 1000); // Longer timeout to ensure state updates are applied
    } catch (error) {
      console.error('Error printing map:', error);
      alert('Failed to print map. Please try again.');
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="map-maker-container">
      {/* Left sidebar - Map Key */}
      <div className="sidebar left-sidebar" ref={mapKeyRef}>
        <div className="tab-navigation">
          <button 
            className={`tab-button ${activeTab === 'mapKey' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapKey')}
          >
            Map Key
          </button>
          <button 
            className={`tab-button ${activeTab === 'villages' ? 'active' : ''}`}
            onClick={() => setActiveTab('villages')}
          >
            Villages
          </button>
        </div>
        
        {activeTab === 'mapKey' && (
          <>
            <h3>Map Key</h3>
            <div className="map-key-content">
              {tents.length > 0 && tents.some(tent => tent && tent.x !== undefined) && (
                <div className="map-key-section">
                  <h4>Tents</h4>
                  <ul className="map-key-list">
                    {tents.filter(tent => tent && tent.x !== undefined).map((tent, index) => (
                      <li 
                        key={index} 
                        className="map-key-item"
                        onMouseEnter={() => handleTentHighlightFromKey(index)}
                        onMouseLeave={handleTentUnhighlightFromKey}
                      >
                        <div 
                          className="map-key-color" 
                          style={{ backgroundColor: tent?.color || '#4CAF50' }}
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
              {utilities.length > 0 && (
                <div className="map-key-section">
                  <h4>Utilities</h4>
                  <ul className="map-key-list">
                    {utilities.map((utility, index) => (
                      <li 
                        key={index} 
                        className="map-key-item"
                      >
                        <div 
                          className="map-key-color" 
                          style={{ backgroundColor: utility.color }}
                        ></div>
                        <span className="map-key-label">
                          {utility.type.charAt(0).toUpperCase() + utility.type.slice(1)} - {utility.radius}m
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scoutGroups.length > 0 && (
                <div className="map-key-section">
                  <h4>Scout Groups</h4>
                  <ul className="map-key-list">
                    {scoutGroups.map((group) => {
                      const villageIndex = group.assignedVillageIndex;
                      const assignedVillage = villageIndex !== null ? villages[villageIndex] : null;
                      
                      return (
                        <li 
                          key={group.id} 
                          className="map-key-item"
                        >
                          {assignedVillage && (
                            <div 
                              className="map-key-color" 
                              style={{ backgroundColor: assignedVillage.color }}
                            ></div>
                          )}
                          <span className="map-key-label">
                            {group.name} - {group.numberOfScouts} scouts
                            {assignedVillage 
                              ? ` (Village ${villageIndex! + 1})` 
                              : ' (Unassigned)'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'villages' && (
          <>
            <h3>Villages</h3>
            <div className="village-tools-content">
              <div className="village-display-options">
                <h4>Display Options</h4>
                <select 
                  value={villageDisplayMode}
                  onChange={(e) => setVillageDisplayMode(e.target.value as any)}
                >
                  <option value="default">Default</option>
                  <option value="numbered">Numbered</option>
                  <option value="distances">Distances</option>
                  <option value="area">Area</option>
                  <option value="scouts">Scouts</option>
                </select>
              </div>
              
              {/* Village List with Utility Range Information */}
              <div className="village-list">
                <h4>Village List</h4>
                {villages.length === 0 ? (
                  <p>No villages created yet</p>
                ) : (
                  <ul className="village-items">
                    {villages.map((village, index) => (
                      <li 
                        key={`village-list-${index}`}
                        className={`village-list-item ${selectedVillageIndex === index ? 'selected' : ''}`}
                        onClick={() => handleVillageSelection(index)}
                      >
                        <div className="village-info">
                          <div className="village-color-and-name">
                            <div 
                              className="village-color-indicator" 
                              style={{ backgroundColor: village.color || '#3498db' }}
                            ></div>
                            {editingVillageIndex === index ? (
                              <input
                                type="text"
                                className="village-name-input"
                                defaultValue={getVillageName(index)}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => handleVillageNameSave(e, index)}
                                autoFocus
                              />
                            ) : (
                              <span 
                                className="village-name"
                                onClick={(e) => handleVillageNameEdit(e, index)}
                              >
                                {getVillageName(index)}
                              </span>
                            )}
                          </div>
                          {selectedVillageIndex === index && (
                            <div className="village-stats">
                              <span className="village-area">{Math.round(village.area)} m²</span>
                              <span className="village-scouts">{calculateScoutsCapacity(village.area).scoutCapacity} scouts</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Utility Range Information - Only shown when village is selected */}
                        {selectedVillageIndex === index && (
                          <div className="village-utilities">
                            <h5>Utilities in Range:</h5>
                            {utilities.filter(utility => 
                              checkVillageUtilityRange(village, utility)
                            ).length === 0 ? (
                              <p>No utilities in range</p>
                            ) : (
                              <ul className="utility-list">
                                {utilities.filter(utility => 
                                  checkVillageUtilityRange(village, utility)
                                ).map((utility, uIndex) => (
                                  <li 
                                    key={`village-${index}-utility-${uIndex}`}
                                    className="utility-item"
                                    style={{ color: utility.color }}
                                  >
                                    {utility.type.charAt(0).toUpperCase() + utility.type.slice(1)}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main map area */}
      <div className="map-area">
        <div 
          className="map-content" 
          ref={mapContentRef}
        >
          <div 
            className="map-wrapper" 
            ref={mapWrapperRef}
            onClick={handleMapClick}
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
                  left: `${tent?.x || 0}px`,
                  top: `${tent?.y || 0}px`,
                  width: `${tent?.width || 0}px`,
                  height: `${tent?.height || 0}px`,
                  transform: `rotate(${tent?.rotation || 0}deg)`,
                  backgroundColor: tent?.color || '#4CAF50'
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
            
            {/* Villages */}
            {villages.map((village, index) => (
              <svg 
                key={`village-${index}`}
                className="village"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              >
                <polygon 
                  points={village.points.map(p => `${p.x},${p.y}`).join(' ')}
                  fill={village.color || '#3498db'}
                  fillOpacity="0.3"
                  stroke={village.color || '#3498db'}
                  strokeWidth="2"
                  style={{
                    pointerEvents: isRemovingVillage ? 'all' : 'none'
                  }}
                />
                
                {/* Display distance for each side when in distances mode */}
                {villageDisplayMode === 'distances' && village.points.map((point, pointIndex) => {
                  const nextPoint = village.points[(pointIndex + 1) % village.points.length];
                  const midX = (point.x + nextPoint.x) / 2;
                  const midY = (point.y + nextPoint.y) / 2;
                  
                  // Calculate distance in pixels
                  const distance = Math.sqrt(
                    Math.pow(nextPoint.x - point.x, 2) + 
                    Math.pow(nextPoint.y - point.y, 2)
                  );
                  
                  // Convert to meters using the map scale
                  const distanceInMeters = mapScale ? Math.round(distance * mapScale) : 0;
                  
                  return (
                    <text
                      key={`distance-${pointIndex}`}
                      x={midX}
                      y={midY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#000"
                      fontSize="10"
                      fontWeight="bold"
                      style={{backgroundColor: 'white', padding: '2px'}}
                    >
                      {distanceInMeters} m
                    </text>
                  );
                })}
                
                {/* Display village number if in numbered mode */}
                {villageDisplayMode === 'numbered' && (
                  <text
                    x={village.points.reduce((sum, p) => sum + p.x, 0) / village.points.length}
                    y={village.points.reduce((sum, p) => sum + p.y, 0) / village.points.length}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    {index + 1}
                  </text>
                )}
                
                {/* Display area or perimeter based on display mode */}
                {(villageDisplayMode === 'area' || villageDisplayMode === 'scouts') && (
                  <text
                    x={village.points.reduce((sum, p) => sum + p.x, 0) / village.points.length}
                    y={village.points.reduce((sum, p) => sum + p.y, 0) / village.points.length}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {villageDisplayMode === 'area' ? `${Math.round(village.area)} m²` : 
                     villageDisplayMode === 'scouts' ? `${calculateScoutsCapacity(village.area).scoutCapacity} scouts` : ''}
                  </text>
                )}
                
                {/* Village points for dragging */}
                {activeToolName === 'village' && village.points.map((point, pointIndex) => (
                  <circle
                    key={`village-${index}-point-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={village.color || '#3498db'}
                    stroke="black"
                    strokeWidth="1"
                    onMouseDown={(e) => handleVillagePointMouseDown(index, pointIndex, e)}
                    style={{ cursor: 'move' }}
                  />
                ))}
                
                {/* Village points for dragging */}
                {currentVillage && currentVillage.points.map((point, pointIndex) => (
                  <circle
                    key={`current-village-point-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={currentVillage.color || '#3498db'}
                    stroke="black"
                    strokeWidth="1"
                    onMouseDown={(e) => handleVillagePointMouseDown(villages.length, pointIndex, e)}
                    style={{ cursor: 'move' }}
                  />
                ))}
              </svg>
            ))}
            
            {/* Current village */}
            {isPlacingVillage && currentVillage && (
              <svg 
                className="current-village"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              >
                <polygon 
                  points={currentVillage.points.map(point => `${point.x},${point.y}`).join(' ')}
                  fill={currentVillage.color || '#3498db'}
                  fillOpacity="0.3"
                  stroke={currentVillage.color || '#3498db'}
                  strokeWidth="2"
                  style={{
                    pointerEvents: 'all'
                  }}
                />
                
                {/* Display village number if in numbered mode */}
                {villageDisplayMode === 'numbered' && (
                  <text
                    x={currentVillage.points.reduce((sum, p) => sum + p.x, 0) / currentVillage.points.length}
                    y={currentVillage.points.reduce((sum, p) => sum + p.y, 0) / currentVillage.points.length}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#000"
                    fontSize="16"
                    fontWeight="bold"
                  >
                    {villages.length + 1}
                  </text>
                )}
                
                {/* Display area or scouts for current village */}
                {(villageDisplayMode === 'area' || villageDisplayMode === 'scouts') && (
                  <text
                    x={currentVillage.points.reduce((sum, p) => sum + p.x, 0) / currentVillage.points.length}
                    y={currentVillage.points.reduce((sum, p) => sum + p.y, 0) / currentVillage.points.length}
                    textAnchor="middle"
                    fill="black"
                    fontSize="14"
                    style={{
                      backgroundColor: 'white',
                      padding: '2px',
                      userSelect: 'none'
                    }}
                  >
                    {villageDisplayMode === 'area' ? `${Math.round(calculatePolygonArea(currentVillage.points))} m²` : 
                     villageDisplayMode === 'scouts' ? `${calculateScoutsCapacity(calculatePolygonArea(currentVillage.points)).scoutCapacity} scouts` : ''}
                  </text>
                )}
                
                {/* Village points for dragging */}
                {activeToolName === 'village' && currentVillage && currentVillage.points.map((point, pointIndex) => (
                  <circle
                    key={`current-village-point-${pointIndex}`}
                    cx={point.x}
                    cy={point.y}
                    r={4}
                    fill={currentVillage.color || '#3498db'}
                    stroke="black"
                    strokeWidth="1"
                    onMouseDown={(e) => handleVillagePointMouseDown(villages.length, pointIndex, e)}
                    style={{ cursor: 'move' }}
                  />
                ))}
              </svg>
            )}
            
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
                  pointerEvents: 'none'
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
            
            {/* Utilities */}
            {utilities.map((utility, index) => (
              <svg 
                key={`utility-${index}`}
                className="utility"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none'
                }}
              >
                {/* Utility dot */}
                <circle
                  cx={utility.x}
                  cy={utility.y}
                  r={5}
                  fill={utility.color}
                  stroke="black"
                  strokeWidth="1"
                  onClick={() => handleUtilityClick(index)}
                  style={{ cursor: isRemovingUtility ? 'pointer' : 'default' }}
                />
                {/* Utility radius */}
                {activeToolName === 'utility' && utility.showRadius && (
                  <circle
                    cx={utility.x}
                    cy={utility.y}
                    r={mapScale ? utility.radius / mapScale : 5}
                    stroke={utility.color}
                    strokeWidth="1"
                    fill={utility.color}
                    fillOpacity="0.2"
                  />
                )}
              </svg>
            ))}
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

        {/* Export PDF button */}
        <button 
          className="export-pdf-button"
          onClick={handleExportPDF}
          disabled={isPdfGenerating}
        >
          {isPdfGenerating ? 'Generating...' : 'Export PDF'}
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
                  <p>{(1/mapScale).toFixed(2)} pixels = 1m</p>
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
                <input 
                  type="color" 
                  value={tentColor}
                  onChange={handleTentColorChange}
                />
              </div>
              
              {/* Tent preview */}
              {mapScale && (
                <div className="tent-preview-container">
                  <div className="tent-preview-label">Preview:</div>
                  <div className="tent-preview">
                    <div 
                      className="tent-preview-box"
                      style={{
                        width: `${tentWidth / mapScale}px`,
                        height: `${tentHeight / mapScale}px`,
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
          
          {/* Village Tool - Only enabled if scale is set */}
          <div 
            className={`tool-item ${activeToolName === 'village' ? 'active' : ''} ${!mapScale ? 'disabled' : ''}`}
            onClick={() => handleToolSelect('village')}
          >
            Village
          </div>
          {activeToolName === 'village' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option">
                <label>Color:</label>
                <input 
                  type="color" 
                  value={villageColor}
                  onChange={(e) => setVillageColor(e.target.value)}
                />
              </div>
              
              <div className="tool-buttons">
                {!isPlacingVillage ? (
                  <button 
                    className="tool-button"
                    onClick={handleStartVillage}
                  >
                    Start Village
                  </button>
                ) : (
                  <>
                    <button 
                      className="tool-button"
                      onClick={handleFinishVillage}
                    >
                      Finish Village
                    </button>
                    <button 
                      className="tool-button"
                      onClick={handleCancelVillage}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
              
              {isPlacingVillage && (
                <div className="village-info">
                  <p>Click on map to place village points</p>
                  <p>Click on existing points to connect</p>
                </div>
              )}
              {isRemovingVillage && (
                <div className="village-info">
                  <p>Click on village to remove it</p>
                </div>
              )}
              <div className="tool-buttons">
                {!isRemovingVillage ? (
                  <button 
                    className="tool-button"
                    onClick={handleRemoveVillageButton}
                  >
                    Remove Village
                  </button>
                ) : (
                  <button 
                    className="tool-button"
                    onClick={() => setIsRemovingVillage(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
           </div>
          )}
          
          {/* Utility Tool */}
          <div 
            className={`tool-item ${activeToolName === 'utility' ? 'active' : ''} ${!mapScale ? 'disabled' : ''}`}
            onClick={() => handleToolSelect('utility')}
          >
            Utility
          </div>
          {activeToolName === 'utility' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option">
                <label>Type:</label>
                <select 
                  value={currentUtilityType} 
                  onChange={(e) => handleUtilityTypeChange(e.target.value as 'electricity' | 'water' | 'waste' | 'other')}
                  className="village-dropdown"
                >
                  <option value="electricity">Electricity</option>
                  <option value="water">Water</option>
                  <option value="waste">Waste</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="tool-option">
                <label>Radius:</label>
                <input 
                  type="number" 
                  value={utilityRadius}
                  onChange={(e) => setUtilityRadius(parseFloat(e.target.value))}
                  min="1"
                />
                <span>m</span>
              </div>
              <div className="tool-option">
                <label>Show Radius:</label>
                <input 
                  type="checkbox" 
                  checked={showUtilityRadius}
                  onChange={(e) => setShowUtilityRadius(e.target.checked)}
                />
              </div>
              <div className="tool-option">
                <label>Color:</label>
                <input 
                  type="color" 
                  value={utilityColor}
                  onChange={(e) => setUtilityColor(e.target.value)}
                />
              </div>
              
              <div className="tool-buttons">
                {!isRemovingUtility ? (
                  <button 
                    className="tool-button"
                    onClick={handleRemoveUtilityButton}
                  >
                    Remove Utility
                  </button>
                ) : (
                  <button 
                    className="tool-button"
                    onClick={() => setIsRemovingUtility(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
              {isRemovingUtility && (
                <div className="utility-info">
                  <p>Click on a utility to remove it</p>
                </div>
              )}
            </div>
          )}
          
          {/* Scout Group Tool */}
          <div 
            className={`tool-item ${activeToolName === 'scoutGroup' ? 'active' : ''}`}
            onClick={() => handleToolSelect('scoutGroup')}
          >
            Scout Group
          </div>
          {activeToolName === 'scoutGroup' && isToolExpanded && (
            <div className="tool-options">
              <button 
                className="tool-button add-button"
                onClick={() => handleOpenScoutGroupModal()}
              >
                <span>+</span> Add Scout Group
              </button>
              
              {scoutGroups.length > 0 && (
                <ul>
                  {scoutGroups.map((group) => (
                    <li key={group.id}>
                      <span>{group.name} ({group.numberOfScouts})</span>
                      <div>
                        <button onClick={() => handleOpenScoutGroupModal(group.id)}>Edit</button>
                        <button onClick={() => handleDeleteScoutGroup(group.id)}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              
              {scoutGroups.length === 0 && (
                <p className="no-items-message">No scout groups added yet</p>
              )}
            </div>
          )}
          
          {/* PDF Export Tool */}
          <div 
            className={`tool-item ${activeToolName === 'pdf' ? 'active' : ''}`}
            onClick={() => handleToolSelect('pdf')}
          >
            PDF Export
          </div>
          {activeToolName === 'pdf' && isToolExpanded && (
            <div className="tool-options">
              <div className="tool-option">
                <p>Generate a PDF of your map with all elements included.</p>
              </div>
              
              <button 
                className="tool-button"
                onClick={handleExportPDF}
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? 'Generating...' : 'Export PDF'}
              </button>
              
              {isPdfGenerating && (
                <div className="pdf-loading-indicator">
                  <div className="spinner"></div>
                  <span>Generating PDF, please wait...</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Scout Group Modal */}
      {isScoutGroupModalOpen && currentScoutGroup && (
        <div className="modal-overlay">
          <div className="modal-content scout-group-modal">
            <h3>{editingScoutGroupId !== null ? 'Edit Scout Group' : 'Add Scout Group'}</h3>
            
            <div className="form-group">
              <label>Group Name:</label>
              <input 
                type="text" 
                value={currentScoutGroup.name} 
                onChange={(e) => setCurrentScoutGroup({...currentScoutGroup, name: e.target.value})}
                placeholder="Enter group name"
              />
            </div>
            
            <div className="form-group">
              <label>Number of Scouts:</label>
              <input 
                type="number" 
                min="1"
                value={currentScoutGroup.numberOfScouts} 
                onChange={(e) => setCurrentScoutGroup({...currentScoutGroup, numberOfScouts: parseInt(e.target.value) || 0})}
                placeholder="Enter number of scouts"
              />
            </div>
            
            <div className="form-group">
              <label>Required Utilities:</label>
              <div className="utility-checkboxes">
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentScoutGroup.requiredUtilities.includes('water' as 'water')}
                    onChange={(e) => {
                      const updatedUtilities = e.target.checked 
                        ? [...currentScoutGroup.requiredUtilities, 'water' as 'water']
                        : currentScoutGroup.requiredUtilities.filter(u => u !== 'water');
                      setCurrentScoutGroup({...currentScoutGroup, requiredUtilities: updatedUtilities});
                    }}
                  />
                  Water
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentScoutGroup.requiredUtilities.includes('electricity' as 'electricity')}
                    onChange={(e) => {
                      const updatedUtilities = e.target.checked 
                        ? [...currentScoutGroup.requiredUtilities, 'electricity' as 'electricity']
                        : currentScoutGroup.requiredUtilities.filter(u => u !== 'electricity');
                      setCurrentScoutGroup({...currentScoutGroup, requiredUtilities: updatedUtilities});
                    }}
                  />
                  Electricity
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentScoutGroup.requiredUtilities.includes('waste' as 'waste')}
                    onChange={(e) => {
                      const updatedUtilities = e.target.checked 
                        ? [...currentScoutGroup.requiredUtilities, 'waste' as 'waste']
                        : currentScoutGroup.requiredUtilities.filter(u => u !== 'waste');
                      setCurrentScoutGroup({...currentScoutGroup, requiredUtilities: updatedUtilities});
                    }}
                  />
                  Waste
                </label>
                <label>
                  <input 
                    type="checkbox" 
                    checked={currentScoutGroup.requiredUtilities.includes('other' as 'other')}
                    onChange={(e) => {
                      const updatedUtilities = e.target.checked 
                        ? [...currentScoutGroup.requiredUtilities, 'other' as 'other']
                        : currentScoutGroup.requiredUtilities.filter(u => u !== 'other');
                      setCurrentScoutGroup({...currentScoutGroup, requiredUtilities: updatedUtilities});
                    }}
                  />
                  Other
                </label>
              </div>
            </div>
            
            {villages.length > 0 && (
              <div className="form-group">
                <label>Assign to Village:</label>
                <div className="village-selection">
                  {villages.map((village, index) => {
                    const meetsRequirements = checkVillageRequirements(index, currentScoutGroup);
                    const isAssigned = currentScoutGroup.assignedVillageIndex === index;
                    const villageCapacity = calculateScoutsCapacity(village.area).scoutCapacity;
                    const assignedGroups = scoutGroups.filter(g => g.assignedVillageIndex === index && g.id !== currentScoutGroup.id);
                    const totalAssignedScouts = assignedGroups.reduce((sum, g) => sum + g.numberOfScouts, 0);
                    const remainingCapacity = villageCapacity - totalAssignedScouts;
                    
                    return (
                      <div 
                        key={index} 
                        className={`village-option ${isAssigned ? 'selected' : ''} ${!meetsRequirements ? 'not-suitable' : ''}`}
                        onClick={() => {
                          if (isAssigned) {
                            setCurrentScoutGroup({...currentScoutGroup, assignedVillageIndex: null});
                          } else {
                            setCurrentScoutGroup({...currentScoutGroup, assignedVillageIndex: index});
                          }
                        }}
                      >
                        <div className="village-color" style={{ backgroundColor: village.color }}></div>
                        <div className="village-info">
                          <span>Village {index + 1}</span>
                          <span>Area: {village.area.toFixed(2)} m²</span>
                          <span>Capacity: {remainingCapacity}/{villageCapacity} scouts</span>
                          {!meetsRequirements && (
                            <span className="warning">
                              {remainingCapacity < currentScoutGroup.numberOfScouts 
                                ? 'Not enough capacity' 
                                : 'Missing required utilities'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            <div className="modal-buttons">
              <button onClick={handleSaveScoutGroup}>Save</button>
              <button onClick={handleCloseScoutGroupModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MapMaker;
