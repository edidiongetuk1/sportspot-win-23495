import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Target, Crosshair, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

interface Game {
  value: string;
  label: string;
  icon: React.ElementType;
  gradient: string;
  accentColor: string;
}

const GAMES: Game[] = [
  {
    value: "eFootball FC Mobile",
    label: "eFootball Mobile",
    icon: Target,
    gradient: "from-green-500 via-emerald-500 to-teal-500",
    accentColor: "border-green-500",
  },
  {
    value: "FIFA Mobile",
    label: "FIFA Mobile",
    icon: Target,
    gradient: "from-blue-500 via-indigo-500 to-purple-500",
    accentColor: "border-blue-500",
  },
  {
    value: "Call of Duty Mobile",
    label: "COD Mobile",
    icon: Crosshair,
    gradient: "from-orange-500 via-red-500 to-pink-500",
    accentColor: "border-orange-500",
  },
  {
    value: "PUBG Mobile",
    label: "PUBG Mobile",
    icon: Crosshair,
    gradient: "from-yellow-500 via-orange-500 to-red-500",
    accentColor: "border-yellow-500",
  },
  {
    value: "Mobile Legends",
    label: "Mobile Legends",
    icon: Swords,
    gradient: "from-purple-500 via-pink-500 to-rose-500",
    accentColor: "border-purple-500",
  },
];

interface GameSelectionGridProps {
  selectedGame: string;
  onSelectGame: (game: string) => void;
}

export const GameSelectionGrid = ({ selectedGame, onSelectGame }: GameSelectionGridProps) => {
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Select Game</label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {GAMES.map((game) => {
          const Icon = game.icon;
          const isSelected = selectedGame === game.value;
          const isHovered = hoveredGame === game.value;

          return (
            <Card
              key={game.value}
              className={cn(
                "relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105",
                "border-2 aspect-square",
                isSelected ? `${game.accentColor} shadow-lg shadow-${game.gradient.split('-')[1]}/50` : "border-border/50",
                isHovered && !isSelected && "border-border"
              )}
              onClick={() => onSelectGame(game.value)}
              onMouseEnter={() => setHoveredGame(game.value)}
              onMouseLeave={() => setHoveredGame(null)}
            >
              {/* Gradient Background */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-20",
                  game.gradient,
                  isSelected && "opacity-30"
                )}
              />

              {/* Content */}
              <div className="relative h-full flex flex-col items-center justify-center p-4 space-y-2">
                {/* Icon Container */}
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center",
                    "bg-gradient-to-br transition-all duration-300",
                    game.gradient,
                    isSelected && "scale-110 shadow-xl"
                  )}
                >
                  <Icon className="w-8 h-8 text-white" />
                </div>

                {/* Game Name */}
                <p className="text-xs font-bold text-center leading-tight">
                  {game.label}
                </p>

                {/* Selected Badge */}
                {isSelected && (
                  <Badge
                    variant="default"
                    className="absolute top-2 right-2 bg-green-500 animate-scale-in"
                  >
                    ✓
                  </Badge>
                )}
              </div>

              {/* Shine Effect on Hover */}
              {isHovered && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent animate-fade-in" />
              )}
            </Card>
          );
        })}
      </div>

      {selectedGame && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 animate-fade-in">
          <Badge variant="outline" className="border-primary/50">
            Selected
          </Badge>
          <span className="text-sm font-medium">{selectedGame}</span>
        </div>
      )}
    </div>
  );
};
