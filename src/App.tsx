import { useState, useEffect } from 'react'
import './App.css'
import MapMaker from './components/MapMaker'

function App() {
  const [mapSource, setMapSource] = useState<'base' | 'custom'>('base')
  const [customMapUrl, setCustomMapUrl] = useState<string | null>(null)
  const [savedMaps, setSavedMaps] = useState<string[]>([])
  const [showEditor, setShowEditor] = useState(false)

  // Load saved maps from local storage on component mount
  useEffect(() => {
    const savedMapsData = localStorage.getItem('savedMaps')
    if (savedMapsData) {
      setSavedMaps(JSON.parse(savedMapsData))
    }
  }, [])

  // Save maps to local storage when savedMaps changes
  useEffect(() => {
    if (savedMaps.length > 0) {
      localStorage.setItem('savedMaps', JSON.stringify(savedMaps))
    } else {
      localStorage.removeItem('savedMaps')
    }
  }, [savedMaps])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const fileUrl = URL.createObjectURL(file)
      setCustomMapUrl(fileUrl)
      setMapSource('custom')
      
      // Save the map to local storage
      if (!savedMaps.includes(fileUrl)) {
        setSavedMaps([...savedMaps, fileUrl])
      }
    }
  }

  const handleUseBaseMap = () => {
    setMapSource('base')
  }

  const handleRemoveMap = (mapUrl: string) => {
    const newSavedMaps = savedMaps.filter(url => url !== mapUrl)
    setSavedMaps(newSavedMaps)
    
    // If the removed map was the selected one, switch to base map
    if (customMapUrl === mapUrl) {
      setCustomMapUrl(null)
      setMapSource('base')
    }
  }

  const handleContinue = () => {
    setShowEditor(true)
  }

  const handleBackToSelection = () => {
    setShowEditor(false)
  }

  // Get the current map URL based on selection
  const getCurrentMapUrl = () => {
    return mapSource === 'base' ? '/map/MAP.png' : customMapUrl || '';
  }

  if (showEditor) {
    return <MapMaker mapUrl={getCurrentMapUrl()} onBack={handleBackToSelection} />;
  }

  return (
    <div className="app-container">
      <div className="selector-container">
        <h1 className="selector-title">Map Viewer</h1>
        
        <div className="selector-content">
          <div className="map-selection">
            <h2>Select Map</h2>
            
            <div className="selection-buttons">
              <button 
                className={`btn ${mapSource === 'base' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={handleUseBaseMap}
              >
                Use Base Map
              </button>
              
              <label className={`btn ${mapSource === 'custom' ? 'btn-primary' : 'btn-secondary'}`}>
                Upload Custom Map
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="file-input"
                />
              </label>
            </div>
            
            {savedMaps.length > 0 && (
              <div className="saved-maps">
                <h3>Previously Uploaded Maps</h3>
                <div className="saved-maps-list">
                  {savedMaps.map((mapUrl, index) => (
                    <div key={index} className="saved-map-item">
                      <button
                        className={`btn ${customMapUrl === mapUrl && mapSource === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => {
                          setCustomMapUrl(mapUrl)
                          setMapSource('custom')
                        }}
                      >
                        Map {index + 1}
                      </button>
                      <button 
                        className="btn btn-remove"
                        onClick={() => handleRemoveMap(mapUrl)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                
                {/* Continue button moved here, right after saved maps */}
                <div className="continue-button-container">
                  <button 
                    className="btn btn-primary continue-button"
                    onClick={handleContinue}
                    disabled={mapSource === 'custom' && !customMapUrl}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="map-preview">
            {mapSource === 'base' ? (
              <div className="map-wrapper">
                <img 
                  src="/map/MAP.png" 
                  alt="Base Map" 
                  className="map-image"
                  style={{ maxWidth: '100%', maxHeight: '350px' }}
                />
              </div>
            ) : customMapUrl ? (
              <div className="map-wrapper">
                <img 
                  src={customMapUrl} 
                  alt="Custom Map" 
                  className="map-image"
                  style={{ maxWidth: '100%', maxHeight: '350px' }}
                />
              </div>
            ) : (
              <div className="file-input-container">
                <label className="file-input-label">
                  <span>Drop your map image here</span>
                  <span>or click to browse</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                    className="file-input"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
        
        {/* Continue button for when there are no saved maps */}
        {savedMaps.length === 0 && (
          <div className="continue-button-container">
            <button 
              className="btn btn-primary continue-button"
              onClick={handleContinue}
              disabled={mapSource === 'custom' && !customMapUrl}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
