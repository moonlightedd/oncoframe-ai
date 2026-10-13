import { NavLink } from 'react-router-dom';
import {
  Database,
  BookOpen,
  Table,
  Cpu,
  BarChart3,
  GitCompare,
  AlertTriangle,
  Target,
  Flag,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dataset Audit', icon: Database },
  { path: '/dictionary', label: 'Data Dictionary', icon: BookOpen },
  { path: '/explorer', label: 'Candidate Explorer', icon: Table },
  { path: '/train', label: 'Train Models', icon: Cpu },
  { path: '/evaluation', label: 'Evaluation', icon: BarChart3 },
  { path: '/explainability', label: 'Explainability', icon: GitCompare },
  { path: '/error-analysis', label: 'Error Analysis', icon: AlertTriangle },
  { path: '/predict', label: 'Predict', icon: Target },
  { path: '/limitations', label: 'Limitations', icon: Flag },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-navy-500 min-h-screen flex flex-col flex-shrink-0">
      <div className="px-5 py-6 border-b border-navy-400">
        <h1 className="text-xl font-bold text-white tracking-tight">ONCOFRAME AI</h1>
        <p className="text-xs text-teal-300 mt-1">Lung CT Nodule-Candidate Classifier</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto scrollbar-thin">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-teal-500 text-white'
                        : 'text-navy-100 hover:bg-navy-400 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-navy-400">
        <p className="text-[10px] text-navy-200 leading-tight">
          Research prototype. Not clinically validated.
        </p>
      </div>
    </aside>
  );
}
