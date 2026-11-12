import {
  Award, BarChart3, Bot, Briefcase, Building2, Calendar, ChartLine, CircleCheck, Clock, Cloud, Code, Coins, Compass,
  Cpu, Database, Film, Gamepad2, Gem, Gift, Globe, GraduationCap, Handshake, Headset, Heart, Landmark, Layers,
  LayoutTemplate, Lightbulb, Lock, Mail, MapPin, MessageCircle, Mic, Music, Palette, PenTool, Phone, Plug, Radio,
  RefreshCw, Rocket, Search, Server, Settings, Shield, ShoppingCart, Smartphone, Sparkles, Stethoscope, Store, Target,
  Trophy, Truck, Users, Video, Wallet, Workflow, Zap,
  type LucideIcon, type LucideProps,
} from "lucide-react";

/** Keep keys in sync with backend/apps/core/icons.py */
const ICONS: Record<string, LucideIcon> = {
  palette: Palette, "pen-tool": PenTool, layout: LayoutTemplate, code: Code, layers: Layers, smartphone: Smartphone,
  sparkles: Sparkles, cpu: Cpu, plug: Plug, database: Database, server: Server, "shopping-cart": ShoppingCart,
  video: Video, radio: Radio, mic: Mic, users: Users, gamepad: Gamepad2, wallet: Wallet, coins: Coins, gift: Gift,
  "bar-chart": BarChart3, "chart-line": ChartLine, shield: Shield, globe: Globe, briefcase: Briefcase,
  calendar: Calendar, message: MessageCircle, zap: Zap, rocket: Rocket, search: Search, settings: Settings,
  heart: Heart, building: Building2, "graduation-cap": GraduationCap, truck: Truck, landmark: Landmark,
  stethoscope: Stethoscope, store: Store, film: Film, music: Music, trophy: Trophy, gem: Gem, target: Target,
  compass: Compass, workflow: Workflow, bot: Bot, headset: Headset, clock: Clock, "check-circle": CircleCheck,
  lock: Lock, cloud: Cloud, refresh: RefreshCw, handshake: Handshake, lightbulb: Lightbulb, "map-pin": MapPin,
  mail: Mail, phone: Phone, award: Award,
};

export function Icon({ name, ...props }: { name?: string | null } & Omit<LucideProps, "name">) {
  const Cmp = (name && ICONS[name]) || Layers;
  return <Cmp aria-hidden="true" strokeWidth={1.75} {...props} />;
}

export const ICON_KEYS = Object.keys(ICONS);
