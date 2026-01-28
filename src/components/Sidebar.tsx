// Collapsing sidebar implementation using lucide-react icons and Tailwind CSS
// Import React implicitly or delete import if not used in newer React versions
import { useState } from 'react';
import { MapPin, Layers, Wrench, ChevronLeft, ChevronRight } from 'lucide-react';
import useStore from '../store/isochroneStore';
import IsochroneControl from './IsochroneControl';
import CadastralControl from './CadastralControl';
import ToolsControl from './ToolsControl';

const Sidebar = () => {
  const { currentTab, setTab } = useStore();
  const [collapsed, setCollapsed] = useState(false);

  const tabs = [
    { id: 'isochrones', icon: <MapPin size={20} />, label: 'Isochrones' },
    { id: 'cadastral', icon: <Layers size={20} />, label: 'Cadastral' },
    { id: 'tools', icon: <Wrench size={20} />, label: 'Tools' },
  ];

  return (
    <div 
      className={`relative h-full bg-gray-900/95 backdrop-blur-xl border-r border-gray-800 text-white flex flex-col shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] ${
        collapsed ? 'w-16' : 'w-96'
      }`}
    >
      {/* Header */}
      <div className={`p-4 border-b border-gray-800 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 min-w-[32px] bg-gradient-to-tr from-green-500 to-blue-500 rounded-lg flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-blue-500/20">
          T
        </div>
        {!collapsed && (
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">
            TerraPulse
          </h1>
        )}
      </div>
      
      {/* Tabs */}
      <div className={`flex ${collapsed ? 'flex-col items-center gap-4 py-4' : 'justify-around p-2'} bg-gray-800/50 border-b border-gray-700`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id as any)}
            className={`p-2 rounded-lg transition-colors ${
              currentTab === tab.id 
                ? 'text-blue-400 bg-blue-500/10' 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
            title={tab.label}
          >
            {tab.icon}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {!collapsed && (
        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent p-1">
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            {currentTab === 'isochrones' && <IsochroneControl />}
            {currentTab === 'cadastral' && <CadastralControl />}
            {currentTab === 'tools' && <ToolsControl />}
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button 
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-1/2 transform -translate-y-1/2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white p-1 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Footer */}
      {!collapsed && (
         <div className="p-3 text-center text-xs text-gray-600 border-t border-gray-800">
            v0.1.0 • Built with Deck.gl
         </div>
      )}
    </div>
  );
};


export default Sidebar;
