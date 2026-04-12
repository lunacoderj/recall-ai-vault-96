import { Link, useNavigate } from "react-router-dom";
import { Brain, Settings, LogOut, User, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./notifications/NotificationBell";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-40 glass">
      <div className="container mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/home" className="flex items-center gap-2 group">
          <div className="h-8 w-8 rounded-lg bg-primary/10 p-1 group-hover:scale-110 transition-transform">
            <img src="/logo.png" alt="RecallAI Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold gradient-text">RecallAI</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />

          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="h-8 w-8 border border-border cursor-pointer hover:border-primary/50 transition-colors">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={user.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-semibold text-foreground truncate">{user?.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate("/profile")}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/friends")}
                className="cursor-pointer"
              >
                <Users className="mr-2 h-4 w-4" /> Friends
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate("/settings")}
                className="cursor-pointer"
              >
                <Settings className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
