import { Palette, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme, AccentColor } from '@/contexts/ThemeContext';

const colorOptions: { value: AccentColor; label: string; preview: string }[] = [
  { value: 'husk', label: 'Husk', preview: 'hsl(46 38% 54%)' },
  { value: 'gold', label: 'Gold', preview: 'hsl(45 93% 47%)' },
  { value: 'blue', label: 'Blue', preview: 'hsl(217 91% 60%)' },
  { value: 'purple', label: 'Purple', preview: 'hsl(271 91% 65%)' },
  { value: 'red', label: 'Red', preview: 'hsl(0 84% 60%)' },
];

export function ThemeSwitcher() {
  const { accentColor, setAccentColor, mode, toggleMode } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <Button 
        variant="ghost" 
        size="icon" 
        onClick={toggleMode}
        className="hover:scale-110 transition-transform duration-300"
      >
        {mode === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:scale-110 transition-transform duration-300"
          >
            <Palette className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 animate-scale-in bg-card z-50">
          <DropdownMenuLabel>Accent Color</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {colorOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setAccentColor(option.value)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div
                className="w-5 h-5 rounded-full border-2 border-border"
                style={{ backgroundColor: option.preview }}
              />
              <span className={accentColor === option.value ? 'font-bold' : ''}>
                {option.label}
              </span>
              {accentColor === option.value && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
