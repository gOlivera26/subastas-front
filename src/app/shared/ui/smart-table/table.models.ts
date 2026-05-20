export interface TableColumn {
  header: string;
  key: string;
  type?: 'text' | 'currency' | 'date' | 'badge' | 'action' | 'tag' | 'custom' | 'boolean';
  sortable?: boolean;
  searchFields?: string[];
}

export interface TableAction {
  action: string;
  icon: string;
  color?: string;
  tooltip?: string;
}
