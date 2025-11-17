import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AccentColor = 'husk' | 'gold' | 'blue' | 'purple' | 'red';

interface ThemeContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const accentColors: Record<AccentColor, { primary: string; secondary: string; foreground: string }> = {
  husk: {
    primary: '46 38% 54%',
    secondary: '46 38% 62%',
    foreground: '0 0% 98%'
  },
  gold: {
    primary: '45 93% 47%',
    secondary: '45 93% 55%',
    foreground: '0 0% 10%'
  },
  blue: {
    primary: '217 91% 60%',
    secondary: '217 91% 68%',
    foreground: '0 0% 98%'
  },
  purple: {
    primary: '271 91% 65%',
    secondary: '271 91% 73%',
    foreground: '0 0% 98%'
  },
  red: {
    primary: '0 84% 60%',
    secondary: '0 84% 68%',
    foreground: '0 0% 98%'
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('accent-color');
    return (saved as AccentColor) || 'husk';
  });

  useEffect(() => {
    const root = document.documentElement;
    const colors = accentColors[accentColor];
    
    root.style.setProperty('--accent', colors.primary);
    root.style.setProperty('--accent-foreground', colors.foreground);
    root.style.setProperty('--gradient-accent', `linear-gradient(135deg, hsl(${colors.primary}), hsl(${colors.secondary}))`);
    
    localStorage.setItem('accent-color', accentColor);
  }, [accentColor]);

  const setAccentColor = (color: AccentColor) => {
    setAccentColorState(color);
  };

  return (
    <ThemeContext.Provider value={{ accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export { accentColors };
export type { AccentColor };
