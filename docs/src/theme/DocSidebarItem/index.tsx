import React from 'react';
import OriginalDocSidebarItem from '@theme-original/DocSidebarItem';

import {
  Smile,
  Server,
  Clock3,
  Users,
  Search,
  Crosshair,
  User,
  FileText,
  HelpCircle,
  Settings,
  Layers3,
  List,
  Play,
  Grid2X2,
  Repeat,
  Link,
  Pencil,
} from 'lucide-react';

type Props = {
  item: any;
  onItemClick?: () => void;
  activePath?: string;
  level: number;
  index: number;
};

const iconMap: Record<string, any> = {
  Smile,
  Server,
  Clock: Clock3,
  Users,
  Search,
  Crosshair,
  User,
  File: FileText,
  HelpCircle,
  Settings,
  Layers: Layers3,
  List,
  Play,
  Grid: Grid2X2,
  Repeat,
  Link,
  Edit: Pencil,
};

export default function DocSidebarItem(props: Props): React.ReactNode {
  const iconName = props.item?.customProps?.icon;
  const Icon = iconName ? iconMap[iconName] : null;

  const updatedItem = { ...props.item };

  if (Icon && updatedItem.label) {
    updatedItem.label = (
      <span className="sidebar-icon-label">
        <Icon size={16} strokeWidth={1.8} className="sidebar-icon" />
        <span>{updatedItem.label}</span>
      </span>
    );
  }

  return <OriginalDocSidebarItem {...props} item={updatedItem} />;
}