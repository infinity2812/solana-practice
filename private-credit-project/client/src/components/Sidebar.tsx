import React from 'react';
import { 
  HomeIcon, 
  BuildingOfficeIcon, 
  DocumentTextIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/24/outline';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navigation = [
  { name: 'Dashboard', tab: 'dashboard', icon: HomeIcon },
  { name: 'Pool Management', tab: 'pools', icon: BuildingOfficeIcon },
  { name: 'Loan Applications', tab: 'loans', icon: DocumentTextIcon },
  { name: 'Audit Requests', tab: 'audit', icon: ShieldCheckIcon },
];

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <nav className="space-y-2">
          {navigation.map((item) => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.name}
                onClick={() => setActiveTab(item.tab)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 ${
                    isActive ? 'text-primary-500' : 'text-gray-400'
                  }`}
                />
                {item.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
