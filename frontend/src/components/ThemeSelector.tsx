import { useTheme } from '../contexts/ThemeContext';

interface ThemeOption {
    id: string;
    label: string;
    colors: [string, string]; // [primary, secondary] for preview
}

const themeOptions: ThemeOption[] = [
    { id: 'default', label: 'Neo-Brutalist (Default)', colors: ['#FFD700', '#000000'] },
    { id: 'sea-breeze', label: 'Sea Breeze', colors: ['#98FB98', '#AFEEEE'] },
    { id: 'corporate', label: 'Corporate Minimal', colors: ['#F3F4F6', '#111827'] },
    { id: 'glass', label: 'Glassmorphism', colors: ['#E0E7FF', '#007FFF'] },
];

export default function ThemeSelector() {
    const { theme, setTheme, isDarkMode, toggleDarkMode } = useTheme();

    return (
        <div className="bg-white dark:bg-black border-4 border-black shadow-[8px_8px_0px_0px_var(--shadow-color)] transition-all">
            <div className="bg-black text-white p-4 border-b-4 border-black flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-black uppercase tracking-wider">Interface Theme</h2>
                    <span className="text-xs font-mono bg-white text-black px-2 py-1 font-bold">BETA</span>
                </div>

                {/* Dark Mode Toggle */}
                <div className="flex items-center gap-3">
                    <span className="font-bold uppercase text-sm">Dark Mode</span>
                    <button
                        onClick={toggleDarkMode}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 border-white transition-colors focus:outline-none ${isDarkMode ? 'bg-[#007FFF]' : 'bg-gray-600'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {themeOptions.map((option) => {
                    const isActive = theme === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => setTheme(option.id)}
                            aria-label={`Select ${option.label} theme`}
                            aria-pressed={isActive}
                            className={`
                                relative group overflow-hidden
                                flex flex-col items-center justify-center gap-3
                                p-4 min-h-[120px]
                                border-4 transition-all duration-200
                                focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2
                                ${isActive
                                    ? 'border-black bg-gray-100 translate-x-[4px] translate-y-[4px] shadow-none'
                                    : 'border-black bg-white shadow-[6px_6px_0px_0px_var(--shadow-color)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--shadow-color)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none'
                                }
                            `}
                        >
                            {/* Color Preview Circle */}
                            <div className="flex -space-x-3 pointer-events-none">
                                <div
                                    className="w-8 h-8 rounded-full border-2 border-black"
                                    style={{ backgroundColor: option.colors[0] }}
                                />
                                <div
                                    className="w-8 h-8 rounded-full border-2 border-black"
                                    style={{ backgroundColor: option.colors[1] }}
                                />
                            </div>

                            <span className={`font-bold text-sm uppercase text-black ${isActive ? 'underline' : ''}`}>
                                {option.label}
                            </span>

                            {/* Active Indicator Checkmark */}
                            {isActive && (
                                <div className="absolute top-2 right-2 text-green-600">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
